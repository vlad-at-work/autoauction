# Migration Design Document: Next.js 16 Application from Vercel to Yandex Cloud

## 1. Executive Summary & Migration Strategy

### 1.1 Project Overview

#### 1.1.1 Source Infrastructure: Vercel + Neon PostgreSQL

The current application architecture leverages **Vercel's edge-optimized hosting platform** combined with **Neon's serverless PostgreSQL database**. This infrastructure delivers exceptional developer experience with automatic global CDN distribution, instant Git-based deployments, and on-demand database scaling. Vercel's platform provides sophisticated features including Incremental Static Regeneration (ISR), Edge Functions, and optimized image delivery that have accelerated development velocity. Neon complements this with branching databases, point-in-time recovery, and connection pooling via PgBouncer that seamlessly integrates with Prisma ORM.

However, this architecture presents a **critical compliance challenge**: both Vercel's infrastructure and Neon's database servers are predominantly located outside the Russian Federation. For organizations subject to **Federal Law No. 152-FZ "On Personal Data"**, which mandates that personal data of Russian citizens be stored and processed within Russia's territorial boundaries, this geographic distribution creates **unacceptable legal and operational risk**. The current stack cannot be reconfigured to satisfy these requirements—only complete infrastructure relocation can achieve compliance.

The application's tight coupling with Vercel-specific features—including proprietary Edge Runtime APIs, `VERCEL_*` environment variables, and framework optimizations that degrade outside the Vercel ecosystem—creates **significant migration complexity** that must be systematically addressed. The Prisma ORM layer, while providing valuable abstraction, generates PostgreSQL-specific queries that require careful validation against the target database's compatibility boundaries.

#### 1.1.2 Target Infrastructure: Yandex Cloud + Yandex Managed DB (YDB)

The target infrastructure migrates the entire application stack to **Yandex Cloud's Russian Federation data centers**, with **Yandex Managed Service for YDB** replacing Neon PostgreSQL. This transformation achieves **complete data residency compliance** while maintaining operational capabilities through careful architectural adaptation.

**YDB (Yandex Database)** represents a **fundamentally different database paradigm** from traditional PostgreSQL. Rather than a monolithic relational database, YDB is a **distributed SQL database** built on a custom storage engine with **YQL (Yandex Query Language)** as its native interface. Key architectural distinctions include:

| Aspect                  | Neon PostgreSQL                          | YDB                                                  |
| :---------------------- | :--------------------------------------- | :--------------------------------------------------- |
| **Architecture**        | Monolithic, single-node or read replicas | Distributed, shared-nothing with automatic sharding  |
| **Query Language**      | Standard PostgreSQL SQL                  | YQL (SQL-like with distributed extensions)           |
| **Connection Protocol** | PostgreSQL wire protocol (TCP/5432)      | gRPC with mandatory TLS (TCP/2135)                   |
| **Transaction Model**   | ACID with pessimistic locking            | Distributed ACID with optimistic concurrency control |
| **Scaling**             | Vertical + read replicas                 | Horizontal, automatic partition splitting            |
| **Primary Key**         | Optional, with sequences                 | **Required**, critical for data distribution         |
| **Foreign Keys**        | Enforced at database level               | **Not enforced**—application-level responsibility    |

YDB offers **experimental PostgreSQL compatibility mode** that enables connection via standard PostgreSQL drivers, potentially allowing Prisma to function with minimal modification. However, this compatibility is **explicitly marked as experimental** with substantial limitations that demand proactive mitigation. The migration must evaluate three integration strategies: direct Prisma compatibility (high risk), custom YDB driver development (unsupported), or a **hybrid approach combining Prisma's schema management with native YDB SDK for data access** (recommended).

#### 1.1.3 Critical Requirement: Russian Federation Data Residency

The **non-negotiable requirement** for Russian Federation data residency shapes every technical decision in this migration. **Federal Law No. 152-FZ** establishes that operators processing personal data of Russian citizens must ensure recording, systematization, accumulation, storage, clarification, and extraction occur using databases located within Russia. Violations carry penalties including fines up to **75 million rubles** for repeated offenses and potential service blocking by Roskomnadzor.

**Yandex Cloud's infrastructure** satisfies this requirement through:

- **Physical data centers** exclusively within Russian territory (`ru-central1` in Moscow, `ru-central2` expanding to other regions)
- **Certified compliance** with 152-FZ and other Russian regulatory frameworks
- **Network isolation** ensuring no data transmission through foreign infrastructure
- **Audit trails** demonstrating data location for compliance verification

The residency requirement extends beyond primary database storage to encompass **all data processing**: application logs, session storage, caching layers, backup archives, and even temporary computation data. This comprehensive scope eliminates hybrid migration strategies and demands **complete infrastructure relocation**.

### 1.2 Migration Approach Selection

#### 1.2.1 Deployment Target Options: Serverless vs. VPS Comparison

Yandex Cloud offers three primary compute deployment models, each with distinct characteristics that must be evaluated against Next.js 16 requirements:

| **Deployment Option**            | **Infrastructure Model**               | **Cold Start Latency**       | **Scaling Characteristics**        | **Next.js 16 Compatibility**                             | **Operational Complexity** | **Cost Predictability** |
| :------------------------------- | :------------------------------------- | :--------------------------- | :--------------------------------- | :------------------------------------------------------- | :------------------------- | :---------------------- |
| **Yandex Cloud Functions**       | Pure serverless, function-per-endpoint | 100ms–3s variable            | Automatic, per-request             | **Poor**—requires application decomposition              | Low                        | Variable, usage-based   |
| **Yandex Serverless Containers** | Containerized serverless               | 500ms–5s for complex images  | Automatic, with concurrency limits | **Moderate**—cold start penalties, 15min execution limit | Low-Medium                 | Variable, vCPU-seconds  |
| **Yandex Compute Cloud VM**      | Traditional virtual machine            | **None** (always running)    | Manual or auto-scaling groups      | **Excellent**—full Node.js runtime                       | Medium                     | High, hourly pricing    |
| **Yandex Managed Kubernetes**    | Container orchestration platform       | None (with readiness probes) | Pod-based horizontal scaling       | Excellent                                                | **Very High**              | Moderate complexity     |

**Critical analysis reveals that serverless options are unsuitable for this migration:**

- **Cloud Functions** fundamentally conflict with Next.js 16's integrated architecture. The framework's unified build combining static generation, server rendering, and API endpoints cannot be decomposed into discrete functions without **sacrificing core framework benefits** and introducing prohibitive complexity .

- **Serverless Containers** improve on Cloud Functions by accepting standard container images, but impose **cold start latency** (500ms–5s) that degrades user experience for interactive applications, **15-minute execution limits** that constrain long-running operations, and **no persistent local storage** that complicates caching and session management .

- **Compute Cloud VMs** provide **complete Next.js 16 compatibility** with no architectural constraints, enabling server-side rendering, API routes, middleware, and WebSocket connections without modification. The predictable performance and straightforward debugging substantially reduce migration risk.

**The VPS-based deployment on Yandex Compute Cloud is strongly recommended** for initial migration. While serverless containers may be evaluated for future optimization, the experimental nature of YDB's PostgreSQL compatibility combined with Next.js's server-side rendering requirements makes **VM-based deployment the prudent choice** for production reliability.

#### 1.2.2 Recommended Architecture: Yandex Cloud VM with Containerized Deployment

The selected architecture implements **production-hardened patterns** proven in similar migrations:

| **Layer**              | **Technology**                    | **Configuration**                                  | **Purpose**                                    |
| :--------------------- | :-------------------------------- | :------------------------------------------------- | :--------------------------------------------- |
| **Compute**            | Yandex Compute Cloud VM           | 2–4 vCPU, 4–8 GB RAM, Ubuntu 22.04/24.04 LTS       | Application runtime with Docker                |
| **Container Runtime**  | Docker CE + Docker Compose        | Multi-stage builds, non-root execution             | Application packaging and orchestration        |
| **Reverse Proxy**      | Nginx 1.24+                       | HTTP/2, Brotli compression, Let's Encrypt SSL      | Edge termination and static asset optimization |
| **Process Management** | Systemd                           | Auto-restart, health checks, log aggregation       | Production service reliability                 |
| **Database**           | YDB Dedicated                     | Multi-AZ, IAM authentication, private connectivity | Distributed SQL data persistence               |
| **Object Storage**     | Yandex Object Storage             | S3-compatible API, CDN integration                 | Static assets, uploads, backups                |
| **Secrets Management** | Yandex Lockbox                    | Versioned payloads, IAM access control             | Credential injection and rotation              |
| **Monitoring**         | Yandex Cloud Logging + Monitoring | Structured logs, custom metrics, alerting          | Operational observability                      |

This architecture achieves **development-production parity** through containerization, enables **horizontal scaling** via instance groups when load demands increase, and maintains **operational flexibility** for debugging and optimization. The VM-based approach eliminates cold start concerns and provides **direct VPC connectivity to YDB** without the VPC connector infrastructure required for serverless platforms.

#### 1.2.3 Risk Assessment: YDB PostgreSQL Compatibility Limitations

The **highest technical risk** in this migration stems from YDB's experimental PostgreSQL compatibility mode. While YDB implements wire-protocol compatibility enabling standard PostgreSQL client connections, **substantial feature gaps** demand proactive mitigation:

| **PostgreSQL Feature Category**  | **YDB Compatibility Status** | **Migration Impact** | **Mitigation Strategy**                       |
| :------------------------------- | :--------------------------- | :------------------- | :-------------------------------------------- |
| **Basic CRUD operations**        | ✅ Supported                 | Minimal              | Standard Prisma operations                    |
| **Simple JOINs**                 | ✅ Supported                 | Low                  | Verify execution plans                        |
| **Standard data types**          | ⚠️ Partial                   | Moderate             | Type mapping validation                       |
| **Complex CTEs (recursive)**     | ❌ **Not supported**         | **High**             | Restructure queries or application logic      |
| **Window functions**             | ⚠️ Limited subset            | Moderate             | Simplify or pre-aggregate                     |
| **Full-text search**             | ❌ **Not supported**         | **High**             | External search service (Elasticsearch, etc.) |
| **JSON/JSONB operations**        | ⚠️ Different syntax          | Moderate             | YDB JSON path expressions                     |
| **Stored procedures (PL/pgSQL)** | ❌ **Not supported**         | **High**             | Migrate to application layer                  |
| **Triggers**                     | ⚠️ Limited                   | Moderate             | Application event handlers                    |
| **Foreign key constraints**      | ❌ **Not enforced**          | **High**             | Application-level validation                  |
| **Advisory locks**               | ❌ **Not supported**         | Moderate             | Distributed locking alternatives              |
| **LISTEN/NOTIFY**                | ❌ **Not supported**         | Moderate             | Polling or message queues                     |

The **Prisma ORM integration** presents specific challenges: Prisma's query engine generates sophisticated SQL that may exercise compatibility boundaries, particularly for relation loading with nested includes, interactive transactions, and raw query fallbacks. The recommended **hybrid architecture** preserves Prisma for schema management and verified-compatible operations while implementing **direct YDB SDK usage** for complex queries, bulk operations, and performance-critical paths.

### 1.3 Phase-Based Migration Timeline

| **Phase**                                | **Duration** | **Key Deliverables**                                                                | **Critical Path Items**                              |
| :--------------------------------------- | :----------- | :---------------------------------------------------------------------------------- | :--------------------------------------------------- |
| **Phase 1: Infrastructure Provisioning** | 3–5 days     | Yandex Cloud organization, VPC network, service accounts, YDB provisioning          | IAM role configuration, network isolation validation |
| **Phase 2: Database Migration**          | 5–10 days    | Schema transformation, data export/import, Prisma adaptation, compatibility testing | YQL DDL creation, data integrity verification        |
| **Phase 3: Application Deployment**      | 4–6 days     | Containerization, VM deployment, integration testing, performance benchmarking      | Health check validation, load testing                |
| **Phase 4: DNS Cutover**                 | 2–3 days     | DNS migration, real-time monitoring, rollback capability, post-cutover validation   | TTL reduction, traffic shifting, stabilization       |

**Total estimated duration: 3–4 weeks** with dedicated resources, assuming no blocking issues in database compatibility validation.

---

## 2. Yandex Cloud Account and Security Configuration

### 2.1 Service Account Creation and IAM Setup

#### 2.1.1 Creating Dedicated Service Account for Application Runtime

Yandex Cloud's **Identity and Access Management (IAM)** system requires explicit service account creation for programmatic resource authentication. Unlike user accounts for console access, service accounts enable **secure, automated authentication** by applications and infrastructure tools.

**Recommended service account structure:**

| **Service Account** | **Purpose**                            | **Lifecycle**                     |
| :------------------ | :------------------------------------- | :-------------------------------- |
| `nextjs-app-prod`   | Application runtime on VM instances    | Long-lived, attached to VM        |
| `nextjs-ci-cd`      | GitHub Actions deployment automation   | Key-based, regular rotation       |
| `nextjs-db-admin`   | Database schema migrations and backups | Elevated privileges, time-limited |
| `nextjs-monitoring` | Metrics export and log ingestion       | Read-only, minimal scope          |

Creation via Yandex Cloud CLI:

```bash
# Authenticate and configure
yc init

# Create application runtime service account
yc iam service-account create \
  --name nextjs-app-prod \
  --description "Production Next.js application runtime" \
  --folder-id <FOLDER_ID>

# Capture identifier for subsequent operations
export SA_APP_ID=$(yc iam service-account get nextjs-app-prod --format json | jq -r '.id')
```

**Naming conventions** should incorporate environment designation (`prod`, `staging`, `dev`) and functional role to enable scalable identity management as infrastructure grows.

#### 2.1.2 Assigning Minimum Required Roles: `editor`, `viewer`, `ydb.editor`

**Principle of least privilege** governs all role assignments, with explicit justification for each permission:

| **Service Account** | **Role**                           | **Scope**                      | **Justification**                          |
| :------------------ | :--------------------------------- | :----------------------------- | :----------------------------------------- |
| `nextjs-app-prod`   | `ydb.editor`                       | Specific YDB database instance | Full database operations, schema evolution |
| `nextjs-app-prod`   | `lockbox.payloadViewer`            | Specific Lockbox secrets       | Runtime secret retrieval                   |
| `nextjs-app-prod`   | `logging.writer`                   | Folder                         | Application log ingestion                  |
| `nextjs-app-prod`   | `monitoring.viewer`                | Folder                         | Health check and metrics read              |
| `nextjs-ci-cd`      | `container-registry.images.pusher` | Specific registry              | Image publication                          |
| `nextjs-ci-cd`      | `compute.editor`                   | Specific VM/instance group     | Deployment updates                         |
| `nextjs-db-admin`   | `ydb.admin`                        | Specific YDB database          | Schema migrations, backups                 |

**Critical security practice:** The `editor` role at folder or cloud level is **explicitly avoided**. Instead, permissions are scoped to specific resources, reducing blast radius of potential credential compromise.

Role assignment implementation:

```bash
# Grant YDB editor role to application service account
yc resource-manager folder add-access-binding <FOLDER_ID> \
  --role ydb.editor \
  --subject serviceAccount:$SA_APP_ID

# Grant Lockbox secret access
yc lockbox secret add-access-binding nextjs-app-secrets \
  --role lockbox.payloadViewer \
  --subject serviceAccount:$SA_APP_ID
```

#### 2.1.3 Configuring Service Account for VM Instance Metadata Authentication

**Metadata service authentication** eliminates credential distribution complexity. When a VM instance is created with an attached service account, applications can obtain **temporary IAM tokens** via the internal endpoint `169.254.169.254` without embedded credentials.

VM creation with service account attachment:

```bash
yc compute instance create \
  --name nextjs-app-prod-01 \
  --zone ru-central1-a \
  --platform standard-v3 \
  --cores 2 \
  --memory 4GB \
  --create-boot-disk size=50GB,image-folder-id=standard-images,image-family=ubuntu-2204-lts \
  --network-interface subnet-name=app-subnet-a,nat-ip-version=ipv4 \
  --service-account-name nextjs-app-prod \
  --metadata-from-file user-data=cloud-init.yaml
```

**Token retrieval in application code:**

```javascript
// Automatic via YDB SDK
import { IamAuthService } from '@ydbjs/core';
const authService = new IamAuthService(); // Detects metadata service automatically

// Manual retrieval for custom implementations
const tokenResponse = await fetch(
  'http://169.254.169.254/computeMetadata/v1/instance/service-accounts/default/token',
  { headers: { 'Metadata-Flavor': 'Google' } }
);
const { access_token, expires_in } = await tokenResponse.json();
```

Tokens are **valid for 12 hours** with automatic refresh handled by SDKs, eliminating rotation procedures and credential exposure risk.

### 2.2 API Key and Credential Management

#### 2.2.1 Generating IAM Tokens for Programmatic Access

For **external authentication scenarios** (CI/CD pipelines, local development, emergency access), IAM tokens provide time-limited programmatic access:

| **Scenario**      | **Token Source**             | **Lifetime**     | **Security Controls**                                  |
| :---------------- | :--------------------------- | :--------------- | :----------------------------------------------------- |
| CI/CD pipeline    | Service account key exchange | 12 hours maximum | Key stored as encrypted secret, rotation every 90 days |
| Local development | User OAuth token exchange    | 12 hours         | Personal account, MFA enforced                         |
| Emergency access  | Break-glass service account  | 1 hour           | Audit logging, immediate notification                  |

Service account key creation for CI/CD:

```bash
yc iam key create \
  --service-account-name nextjs-ci-cd \
  --output ci-cd-key.json \
  --description "GitHub Actions deployment key"

# Store ci-cd-key.json as encrypted secret in GitHub
# Workflow exchanges for IAM token during execution
```

#### 2.2.2 Creating Static Access Keys for S3-Compatible Object Storage

**Yandex Object Storage** requires **static access keys** (access key ID + secret access key) for S3 API compatibility. These credentials differ from IAM tokens in being **long-lived until explicitly revoked**, requiring careful lifecycle management.

Key creation and secure storage:

```bash
yc iam access-key create \
  --service-account-name nextjs-app-prod \
  --description "Object Storage access for application assets"
# Output: access_key_id (YCAJE...) and secret_access_key (displayed once)
```

**Immediate storage in Yandex Lockbox**—never logged, never emailed:

```bash
yc lockbox secret create \
  --name nextjs-storage-credentials \
  --payload "[{'key': 'S3_ACCESS_KEY_ID', 'text_value': 'YCAJE...'}, {'key': 'S3_SECRET_ACCESS_KEY', 'text_value': 'YCP...'}]"
```

Application integration uses standard AWS SDK with Yandex Cloud endpoint:

```javascript
import { S3Client } from '@aws-sdk/client-s3';
const s3Client = new S3Client({
  endpoint: 'https://storage.yandexcloud.net',
  region: 'ru-central1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID, // From Lockbox
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true, // Required for Yandex compatibility
});
```

#### 2.2.3 Secure Credential Storage: Yandex Lockbox Integration

**Yandex Lockbox** provides centralized secrets management with **encryption at rest**, fine-grained IAM access control, and comprehensive audit logging. All sensitive configuration must reside in Lockbox, not environment variables or configuration files.

**Lockbox secret structure:**

| **Secret Name**              | **Contents**                                        | **Access Pattern**                          |
| :--------------------------- | :-------------------------------------------------- | :------------------------------------------ |
| `nextjs-db-connection`       | YDB endpoint, database path, IAM configuration      | Retrieved at application startup            |
| `nextjs-storage-credentials` | S3 access keys, bucket names                        | Retrieved at startup, cached                |
| `nextjs-external-apis`       | Payment processor keys, notification service tokens | Retrieved on-demand for specific operations |
| `nextjs-session-keys`        | JWT signing keys, encryption salts                  | Loaded to memory at startup                 |

**Runtime retrieval pattern:**

```javascript
import { LockboxClient } from '@yandex-cloud/nodejs-sdk';

const lockbox = new LockboxClient({ authService: iamAuthService });

async function loadSecrets() {
  const dbSecret = await lockbox.payload.get({
    secretId: 'nextjs-db-connection',
    versionId: 'latest',
  });
  const config = Object.fromEntries(dbSecret.entries.map((e) => [e.key, e.textValue]));
  return config; // Never logged, held in memory only
}
```

### 2.3 Network and VPC Configuration

#### 2.3.1 Creating Isolated VPC Network in Russian Federation Zone

**Virtual Private Cloud (VPC)** creation establishes network isolation boundaries, with mandatory deployment in **`ru-central1`** for data residency compliance.

```bash
yc vpc network create \
  --name nextjs-app-network \
  --description "Isolated VPC for Next.js application - 152-FZ compliant" \
  --folder-id <FOLDER_ID>

export VPC_ID=$(yc vpc network get nextjs-app-network --format json | jq -r '.id')
```

**Design decisions:**

- **RFC 1918 private addressing**: `10.0.0.0/16` provides 65,536 addresses for growth
- **No default routes**: Explicit routing configuration prevents unintended connectivity
- **DNS resolution**: Private DNS zone for internal service discovery

#### 2.3.2 Configuring Subnets Across Multiple Availability Zones

**Multi-AZ deployment** ensures high availability with automatic failover:

| **Subnet** | **Availability Zone** | **CIDR**        | **Purpose**                 | **Route Table**           |
| :--------- | :-------------------- | :-------------- | :-------------------------- | :------------------------ |
| `public-a` | `ru-central1-a`       | `10.0.1.0/24`   | Load balancers, NAT gateway | Public (internet gateway) |
| `public-b` | `ru-central1-b`       | `10.0.2.0/24`   | Load balancers (HA)         | Public                    |
| `app-a`    | `ru-central1-a`       | `10.0.10.0/24`  | Application VMs             | Private (NAT gateway)     |
| `app-b`    | `ru-central1-b`       | `10.0.11.0/24`  | Application VMs (HA)        | Private                   |
| `db-a`     | `ru-central1-a`       | `10.0.20.0/26`  | YDB dedicated nodes         | Private (no internet)     |
| `db-b`     | `ru-central1-b`       | `10.0.21.0/26`  | YDB replica nodes           | Private                   |
| `db-c`     | `ru-central1-c`       | `10.0.22.0/26`  | YDB replica nodes           | Private                   |
| `mgmt`     | `ru-central1-a`       | `10.0.100.0/26` | Bastion hosts, jump boxes   | Public (restricted)       |

Subnet creation:

```bash
for zone in a b; do
  yc vpc subnet create \
    --name app-$zone \
    --zone ru-central1-$zone \
    --network-id $VPC_ID \
    --range 10.0.1$zone.0/24
done
```

#### 2.3.3 Establishing NAT Gateway and Security Group Rules

**NAT gateway** enables controlled outbound internet access from private subnets:

```bash
yc vpc gateway create --name nextjs-nat --shared-egress-gateway

yc vpc route-table create \
  --name private-rt \
  --network-id $VPC_ID \
  --route destination=0.0.0.0/0,gateway-name=nextjs-nat

yc vpc subnet update app-a --route-table-name private-rt
yc vpc subnet update app-b --route-table-name private-rt
```

**Security group rules** implement defense-in-depth:

| **Security Group** | **Direction** | **Protocol** | **Port**   | **Source/Destination** | **Purpose**                             |
| :----------------- | :------------ | :----------- | :--------- | :--------------------- | :-------------------------------------- |
| `sg-ydb`           | Inbound       | TCP          | 2135, 2136 | `sg-app`               | YDB gRPC/HTTPS from application tier    |
| `sg-app`           | Inbound       | TCP          | 3000       | `sg-lb`                | Application from load balancer          |
| `sg-app`           | Inbound       | TCP          | 22         | `sg-mgmt`              | SSH from bastion hosts                  |
| `sg-app`           | Outbound      | TCP          | 443        | `0.0.0.0/0`            | HTTPS to Yandex APIs, external services |
| `sg-app`           | Outbound      | TCP          | 2135       | `sg-ydb`               | YDB connectivity                        |
| `sg-lb`            | Inbound       | TCP          | 80, 443    | `0.0.0.0/0`            | Public web traffic                      |
| `sg-mgmt`          | Inbound       | TCP          | 22         | `<admin-ip>/32`        | Restricted administrative access        |

#### 2.3.4 Enabling Private Connectivity Between Application and YDB

**Private connectivity** eliminates internet exposure for database traffic. For **dedicated YDB**, VPC peering or private endpoint configuration enables direct routing:

```bash
# YDB dedicated instance with private endpoint
yc ydb database create \
  --name nextjs-prod-db \
  --resource-preset medium \
  --storage-type ssd \
  --storage-size 100GB \
  --network-id $VPC_ID \
  --subnet-ids $SUBNET_A_ID,$SUBNET_B_ID,$SUBNET_C_ID
```

The resulting **private endpoint** (`grpcs://<private-host>:2135`) ensures:

- **No internet traversal**: Traffic remains within Yandex Cloud backbone
- **Reduced latency**: Direct routing without NAT or proxy overhead
- **Enhanced security**: No public attack surface for database access

For **serverless YDB**, public endpoints with TLS and IAM authentication provide secure access, with traffic encrypted and authenticated regardless of network path.

---

## 3. Yandex Managed DB (YDB) Provisioning and Configuration

### 3.1 YDB Cluster Deployment

#### 3.1.1 Selecting Serverless YDB vs. Dedicated YDB Instance

| **Characteristic**          | **Serverless YDB**                       | **Dedicated YDB**                               | **Recommendation**                         |
| :-------------------------- | :--------------------------------------- | :---------------------------------------------- | :----------------------------------------- |
| **Scaling model**           | Automatic, 0→∞ RPS                       | Manual or auto-scaling groups                   | Dedicated for predictable workloads        |
| **Cold start latency**      | 50–500ms possible                        | **None**                                        | Dedicated eliminates user-facing latency   |
| **Performance consistency** | Variable with platform load              | **Provisioned, guaranteed**                     | Dedicated for production SLAs              |
| **Cost structure**          | Per-request + storage ($0.20/million RU) | Per-hour capacity (~$0.15–0.50/vCPU-hour)       | Dedicated cost-effective at sustained load |
| **Private connectivity**    | Public endpoint required                 | **VPC private endpoint available**              | Dedicated for security compliance          |
| **Operational overhead**    | Minimal                                  | Moderate (capacity planning)                    | Acceptable trade-off for control           |
| **Best for**                | Development, variable/sporadic workloads | **Production, steady-state, latency-sensitive** | **Dedicated for this migration**           |

**Production recommendation: Dedicated YDB** with multi-AZ deployment. The predictable performance, private connectivity, and elimination of cold start risks justify the operational investment for a user-facing application.

Provisioning command:

```bash
yc ydb database create \
  --name nextjs-prod-db \
  --resource-preset medium \
  --storage-type ssd \
  --storage-size 100GB \
  --network-id $VPC_ID \
  --subnet-ids $SUBNET_A_ID,$SUBNET_B_ID,$SUBNET_C_ID \
  --assign-public-ip false  # Private endpoint only
```

#### 3.1.2 Configuring Database Path and Endpoint: `grpcs://<endpoint>:2135`

YDB connection strings encode **protocol, endpoint, and database path**:

| **Component** | **Example Value**                                     | **Description**                           |
| :------------ | :---------------------------------------------------- | :---------------------------------------- |
| Protocol      | `grpcs`                                               | gRPC with mandatory TLS                   |
| Endpoint      | `ydb.ru-central1.yandexcloud.net` or private hostname | Regional or instance-specific entry point |
| Port          | `2135`                                                | Standard YDB gRPC port                    |
| Database path | `/ru-central1/b1g<cloud-id>/etn<database-id>`         | Hierarchical resource identifier          |

**Complete connection string formats:**

```
# Serverless YDB (public endpoint)
grpcs://ydb.serverless.yandexcloud.net:2135?database=/ru-central1/b1g7v8k3q2a1p9z0/etn63999hrinbapmef6g

# Dedicated YDB (private endpoint)
grpcs://lb.etn01f8gv9an9sedo9fu.ydb.mdb.yandexcloud.net:2135?database=/ru-central1/b1g7v8k3q2a1p9z0/etn01f8gv9an9sedo9fu
```

**Retrieval from Yandex Cloud Console or CLI:**

```bash
yc ydb database get nextjs-prod-db --format json | jq -r '.endpoint, .database_path'
```

#### 3.1.3 Enabling Experimental PostgreSQL Compatibility Mode

YDB's **PostgreSQL compatibility mode** enables wire-protocol connection via standard PostgreSQL drivers. **Critical caveats:**

- **Explicitly experimental** with no production SLA
- **Feature coverage incomplete**: Advanced PostgreSQL features unsupported
- **Performance characteristics differ**: Query plans and execution may vary
- **Future compatibility not guaranteed**: YDB evolution may break existing integrations

**Enable via YDB CLI or console:**

```bash
ydb -e <endpoint> -d <database-path> \
  config compatibility postgresql enable
```

**Validation checklist before production reliance:**

- [ ] `prisma db pull` completes without errors
- [ ] All Prisma Client CRUD operations execute successfully
- [ ] Complex queries (nested includes, aggregations) return correct results
- [ ] Transaction rollback functions as expected
- [ ] Connection pooling operates without leaks under load

**If any check fails**, proceed to hybrid architecture (Section 4.5.3) rather than forcing compatibility mode.

#### 3.1.4 Setting Up Database Credentials and Authentication Methods

| **Method**                         | **Use Case**          | **Configuration**                        |
| :--------------------------------- | :-------------------- | :--------------------------------------- |
| **IAM token via metadata service** | **Production VMs**    | Automatic, no embedded credentials       |
| **Service account key exchange**   | CI/CD, external tools | JSON key file, 12-hour token lifetime    |
| **Static credentials**             | Legacy compatibility  | Username/password, limited functionality |

**Production configuration (metadata service):**

```javascript
import { Driver } from '@ydbjs/core';
import { IamAuthService } from '@ydbjs/auth';

const driver = new Driver({
  endpoint: process.env.YDB_ENDPOINT,
  database: process.env.YDB_DATABASE,
  authService: new IamAuthService(), // Auto-detects metadata service
});
await driver.ready();
```

### 3.2 YDB Architecture and YQL Fundamentals

#### 3.2.1 Understanding YDB's Distributed SQL Engine

YDB's **distributed architecture** fundamentally differs from monolithic PostgreSQL:

| **Component**                  | **Function**                                            | **Operational Impact**                               |
| :----------------------------- | :------------------------------------------------------ | :--------------------------------------------------- |
| **Tablets**                    | Horizontal data partitions with independent replication | Primary key design critical for distribution         |
| **Distributed transactions**   | Cross-tablet ACID via optimistic concurrency control    | Conflict retry logic required in application         |
| **Storage/compute separation** | Independent scaling of capacity and processing          | Query performance varies with data locality          |
| **Multi-AZ replication**       | Synchronous replication across 3 availability zones     | Automatic failover, read-from-any-replica capability |

**Tablet splitting** occurs automatically as data grows, with split boundaries chosen to maintain even distribution. **Poor primary key design** (sequential IDs, timestamps) creates **hot spots**—concentrated access overwhelming single tablets.

#### 3.2.2 YQL Syntax Differences from Standard PostgreSQL

| **PostgreSQL**                                  | **YQL**                                               | **Notes**                                     |
| :---------------------------------------------- | :---------------------------------------------------- | :-------------------------------------------- |
| `CREATE TABLE ... (id SERIAL PRIMARY KEY, ...)` | `CREATE TABLE ... (id Uint64, ..., PRIMARY KEY (id))` | Explicit `PRIMARY KEY` required; no `SERIAL`  |
| `INSERT ... ON CONFLICT ...`                    | `UPSERT INTO ...`                                     | Native idempotent insert-or-update            |
| `VARCHAR(n)`, `TEXT`                            | `Utf8`                                                | No length limit; UTF-8 validated              |
| `TIMESTAMP WITH TIME ZONE`                      | `Timestamp`                                           | Nanosecond precision; timezone in application |
| `JSONB`                                         | `Json` or `JsonDocument`                              | Limited query operators; evolving support     |
| `ARRAY` types                                   | `List<T>`                                             | Nested collections with different functions   |
| `SELECT ... FOR UPDATE`                         | Not supported                                         | Optimistic concurrency control instead        |

#### 3.2.3 Data Type Mappings: PostgreSQL Types to YDB Types

| **PostgreSQL**             | **YDB Native**         | **Prisma Annotation** | **Compatibility Notes**              |
| :------------------------- | :--------------------- | :-------------------- | :----------------------------------- |
| `SERIAL`, `BIGSERIAL`      | `Uint64` with sequence | `BigInt @id`          | Application-managed or YDB sequence  |
| `INTEGER`                  | `Int32`                | `Int`                 | Direct                               |
| `BIGINT`                   | `Int64`                | `BigInt`              | Direct                               |
| `VARCHAR(n)`, `TEXT`       | `Utf8`                 | `String`              | No length constraint in YDB          |
| `BOOLEAN`                  | `Bool`                 | `Boolean`             | Direct                               |
| `TIMESTAMP`, `TIMESTAMPTZ` | `Timestamp`            | `DateTime`            | Microsecond vs. nanosecond precision |
| `DATE`                     | `Date`                 | `DateTime @db.Date`   | Direct                               |
| `NUMERIC(p,s)`             | `Decimal(p,s)`         | `Decimal`             | Verify precision limits              |
| `UUID`                     | `Uuid`                 | `String @db.Uuid`     | Native in recent YDB versions        |
| `JSON`, `JSONB`            | `Json`                 | `Json`                | Query capabilities differ            |

#### 3.2.4 Limitations of PostgreSQL Compatibility Mode for Complex Queries

**Critical limitations requiring application adaptation:**

| **Feature**                                 | **Status**       | **Workaround**                              |
| :------------------------------------------ | :--------------- | :------------------------------------------ |
| Recursive CTEs (`WITH RECURSIVE`)           | ❌ Not supported | Application recursion or iterative queries  |
| Advanced window functions (`FRAME` clauses) | ⚠️ Limited       | Simplify or pre-aggregate                   |
| Full-text search (`tsvector`, `tsquery`)    | ❌ Not supported | External search index (Elasticsearch, etc.) |
| Geospatial types (PostGIS)                  | ❌ Not supported | Application-level geometric libraries       |
| Custom aggregates                           | ❌ Not supported | Pre-computation or map-reduce patterns      |
| Triggers                                    | ⚠️ Limited       | Application event handlers                  |
| Stored procedures (PL/pgSQL)                | ❌ Not supported | Application business logic                  |

### 3.3 Connection Configuration for Application Layer

#### 3.3.1 Constructing YDB Connection String Format

**Native YDB SDK:**

```javascript
const connectionString =
  'grpcs://ydb.ru-central1.yandexcloud.net:2135?database=/ru-central1/b1g.../etn...';
```

**Prisma with PostgreSQL compatibility (if validated):**

```prisma
datasource db {
  provider = "postgresql"
  url      = "postgresql://token@ydb-compat-endpoint:5432/db?sslmode=require"
}
```

#### 3.3.2 Configuring gRPC TLS Encryption for Production

**Mandatory TLS** with certificate validation:

```javascript
const driver = new Driver({
  endpoint: 'grpcs://ydb.ru-central1.yandexcloud.net:2135',
  database: '/ru-central1/.../nextjs-prod-db',
  authService: new IamAuthService(),
  // TLS implicitly enabled by 'grpcs' protocol
});
```

#### 3.3.3 Connection Pooling and Retry Logic for Distributed Database

| **Parameter**     | **Recommended Value**                         | **Rationale**                             |
| :---------------- | :-------------------------------------------- | :---------------------------------------- |
| Pool size         | 20–50 sessions                                | Match application concurrency             |
| Session timeout   | 5 seconds                                     | Fail fast for unavailable nodes           |
| Operation timeout | 30 seconds                                    | Accommodate distributed transactions      |
| Max retries       | 3 with exponential backoff                    | Handle transient tablet unavailability    |
| Retryable errors  | `UNAVAILABLE`, `ABORTED`, `DEADLINE_EXCEEDED` | Automatic retry for idempotent operations |

```javascript
const driver = new Driver({
  // ... endpoint, database, auth
  poolSettings: {
    minSessions: 5,
    maxSessions: 50,
    keepAlivePeriod: 60000,
  },
  retrySettings: {
    maxRetries: 3,
    onYdbError: (err) => ['UNAVAILABLE', 'ABORTED'].includes(err.code),
  },
});
```

---

## 4. Database Migration: Neon PostgreSQL to YDB

### 4.1 Pre-Migration Assessment and Schema Analysis

#### 4.1.1 Auditing Current Prisma Schema for YDB Compatibility

**Systematic audit checklist:**

| **Element**                 | **Inspection Method** | **YDB Action Required**                      |
| :-------------------------- | :-------------------- | :------------------------------------------- |
| `@id` fields                | Schema review         | Verify `Uint64` or `Utf8` suitability        |
| `@default(autoincrement())` | Prisma schema         | Replace with application sequence or UUID    |
| `@unique` constraints       | Schema + index review | Implement via primary key design or omit     |
| `@relation` with cascade    | Schema review         | Implement cascade in application layer       |
| `Json` fields               | Usage analysis        | Validate YDB JSON query requirements         |
| `Decimal` precision         | Schema review         | Verify YDB `Decimal` precision limits        |
| `Bytes` fields              | Storage analysis      | Consider `String` binary or external storage |
| `enum` types                | Schema review         | YDB `Enum` or application validation         |
| `@db.*` native types        | Schema review         | Map to YDB equivalents                       |

#### 4.1.2 Identifying PostgreSQL-Specific Features Requiring Adaptation

**Feature inventory query:**

```sql
-- PostgreSQL catalog queries for migration planning
SELECT * FROM pg_extension WHERE extname NOT IN ('plpgsql'); -- Installed extensions
SELECT * FROM information_schema.triggers; -- Trigger definitions
SELECT * FROM information_schema.routines WHERE routine_type = 'FUNCTION'; -- Custom functions
SELECT * FROM pg_type WHERE typtype IN ('e', 'c', 'd'); -- Enums, composites, domains
```

#### 4.1.3 Cataloging Stored Procedures, Triggers, and Custom Types

| **Object Type**    | **Migration Strategy**                    | **Effort Estimate**      |
| :----------------- | :---------------------------------------- | :----------------------- |
| Stored functions   | Reimplement in application layer          | Medium–High per function |
| Triggers           | Application middleware or explicit calls  | Medium per trigger       |
| Custom enums       | YDB `Enum` type or application validation | Low                      |
| Composite types    | Flatten to table columns or `Struct` type | Medium                   |
| Domain constraints | Application validation                    | Low                      |

### 4.2 Data Export from Neon PostgreSQL

#### 4.2.1 Creating Consistent Snapshot with `pg_dump`

**Neon-specific considerations:**

- Use **direct connection** (not pooled) for large exports: `postgresql://.../dbname?sslmode=require`
- Leverage **Neon branches** for zero-impact snapshot creation
- Consider **logical replication** for minimal-downtime migration

```bash
# Schema-only export for transformation
pg_dump --host=$NEON_HOST --username=$NEON_USER \
  --schema-only --no-owner --no-privileges \
  --file=neon_schema.sql

# Compressed data export
pg_dump --host=$NEON_HOST --username=$NEON_USER \
  --data-only --compress=9 --format=custom \
  --file=neon_data.dump
```

#### 4.2.2 Exporting Schema-Only vs. Data-Only Dumps

| **Export Type**               | **Purpose**                          | **Processing Pipeline**             |
| :---------------------------- | :----------------------------------- | :---------------------------------- |
| Schema-only (`--schema-only`) | DDL transformation to YQL            | Automated parsing + manual review   |
| Data-only (`--data-only`)     | Bulk import to YDB                   | Direct import or ETL transformation |
| Full (`--clean --if-exists`)  | Complete backup, rollback protection | Archive for contingency             |

#### 4.2.3 Handling Large Dataset Chunking and Parallel Export

**For tables >10GB:**

```bash
# Parallel export by table
pg_dump --table=large_table --jobs=4 --format=directory --file=large_table_dir/

# Key-range chunking
psql -c "COPY (SELECT * FROM large_table WHERE id BETWEEN 1 AND 1000000) TO STDOUT CSV" > chunk_1.csv
```

### 4.3 Schema Transformation and YQL Adaptation

#### 4.3.1 Converting PostgreSQL DDL to YDB-Compatible YQL

**Transformation example:**

```sql
-- PostgreSQL
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    profile JSONB
);

-- YQL
CREATE TABLE users (
    id Uint64,
    email Utf8,
    created_at Timestamp,
    profile Json,
    PRIMARY KEY (id)
) WITH (
    AUTO_PARTITIONING_BY_SIZE = ENABLED,
    AUTO_PARTITIONING_PARTITION_SIZE_MB = 256
);

CREATE UNIQUE INDEX users_email_idx ON users (email);
```

#### 4.3.2 Adapting Prisma Model Definitions for YDB Constraints

```prisma
// YDB-adapted Prisma schema
model User {
  id        BigInt   @id // Application-generated snowflake ID
  email     String   @unique // Enforced by index, not FK constraint
  createdAt DateTime @default(now())
  profile   Json?

  // Relations without database-level enforcement
  posts     Post[]

  @@index([email])
  @@map("users")
}

model Post {
  id       BigInt @id
  authorId BigInt
  author   User   @relation(fields: [authorId], references: [id])

  // No @relation(onDelete: Cascade) — implement in application
}
```

#### 4.3.3 Resolving Foreign Key and Index Differences

**Foreign key emulation:**

```typescript
// Prisma middleware for cascade behavior
prisma.$use(async (params, next) => {
  if (params.model === 'User' && params.action === 'delete') {
    // Manual cascade
    await prisma.post.deleteMany({ where: { authorId: params.args.where.id } });
  }
  return next(params);
});
```

#### 4.3.4 Manual Schema Creation via YDB CLI or Web Console

```bash
# Execute YQL DDL
ydb -e $YDB_ENDPOINT -d $YDB_DATABASE -f schema_transformed.yql

# Verify creation
ydb scheme ls
ydb scheme describe users
```

### 4.4 Data Import to YDB

#### 4.4.1 Yandex Data Transfer Service: Capabilities and Limitations

| **Capability**            | **Status**       | **Notes**                              |
| :------------------------ | :--------------- | :------------------------------------- |
| PostgreSQL source         | ✅ Supported     | Requires public connectivity or VPN    |
| YDB target                | ✅ Supported     | YQL-compatible schema required         |
| Initial snapshot          | ✅ Supported     | Full table copy                        |
| CDC (ongoing replication) | ⚠️ Limited       | Evaluate latency for production        |
| Schema conversion         | ❌ Not automatic | Manual DDL preparation required        |
| Custom transformations    | ⚠️ Limited       | Complex ETL may require custom scripts |

#### 4.4.2 Custom ETL Approach: Node.js Migration Script with `ydb-js`

```typescript
// migration/etl.ts
import { Driver, TypedValues } from '@ydbjs/core';
import { Pool } from 'pg';
import pLimit from 'p-limit';

const BATCH_SIZE = 1000;
const CONCURRENCY = 5;

async function migrateTable(
  pgPool: Pool,
  ydbDriver: Driver,
  tableName: string,
  transform: (row: any) => any
) {
  const limit = pLimit(CONCURRENCY);
  const client = await pgPool.connect();
  const cursor = client.query(new Cursor(`SELECT * FROM ${tableName}`));

  let batch: any[] = [];
  const processBatch = async (rows: any[]) => {
    const transformed = rows.map(transform);
    await ydbDriver.tableClient.withSession(async (session) => {
      await session.executeQuery(
        `
        DECLARE $rows AS List<Struct<...>>;
        UPSERT INTO ${tableName} SELECT * FROM AS_TABLE($rows);
      `,
        { $rows: TypedValues.list(transformed) }
      );
    });
  };

  for await (const row of cursor) {
    batch.push(row);
    if (batch.length >= BATCH_SIZE) {
      await limit(() => processBatch(batch));
      batch = [];
    }
  }
  if (batch.length) await processBatch(batch);
}
```

#### 4.4.3 Batch Insert Optimization for YDB's Distributed Architecture

| **Optimization**            | **Implementation**         | **Impact**                        |
| :-------------------------- | :------------------------- | :-------------------------------- |
| `AS_TABLE` bulk UPSERT      | Native YDB batch parameter | 10–100× throughput vs. row-by-row |
| Primary-key-ordered batches | Pre-sort by partition key  | Minimizes cross-tablet operations |
| Parallel workers            | 4–16 concurrent batches    | Saturates YDB throughput capacity |
| Idempotent operations       | `UPSERT` not `INSERT`      | Safe retry, no duplicate handling |

#### 4.4.4 Validation: Row Count Verification and Checksum Comparison

```typescript
// Validation script
async function validateMigration(pgPool: Pool, ydbDriver: Driver) {
  const tables = ['users', 'posts', 'comments'];

  for (const table of tables) {
    const [{ count: pgCount }] = await pgPool.query(`SELECT COUNT(*) FROM ${table}`);
    const ydbResult = await ydbDriver.query(`SELECT COUNT(*) FROM ${table}`);
    const ydbCount = ydbResult.resultSets[0].rows[0][0].getUint64();

    console.assert(pgCount === ydbCount, `Count mismatch: ${table}`);

    // Checksum sampling for large tables
    const pgSample = await pgPool.query(
      `SELECT MD5(string_agg(id::text, ',')) FROM (SELECT id FROM ${table} ORDER BY id LIMIT 10000) t`
    );
    // YDB equivalent...
  }
}
```

### 4.5 Prisma ORM Integration Strategy

#### 4.5.1 Option A: Direct PostgreSQL Connection String to YDB Compatibility Endpoint

**Attempt if:** Schema is simple, no advanced PostgreSQL features, rapid migration priority.

**Validation required:** All Prisma operations tested against YDB with production-like data.

**Risk:** High—experimental compatibility may break in production.

#### 4.5.2 Option B: Custom Prisma Driver via Unofficial YDB Connector

**Status:** No production-ready implementation identified. **Not recommended** for this migration.

#### 4.5.3 Option C: Hybrid Approach — Prisma for Schema, `ydb-js` for Complex Queries

**Recommended architecture:**

| **Layer**         | **Technology**         | **Responsibility**                       |
| :---------------- | :--------------------- | :--------------------------------------- |
| Schema management | Prisma                 | Migrations, type generation, simple CRUD |
| Complex queries   | `ydb-js` SDK           | Aggregations, joins, bulk operations     |
| Transactions      | Application + `ydb-js` | Distributed transaction coordination     |

```typescript
// lib/db.ts - Hybrid implementation
import { PrismaClient } from '@prisma/client';
import { getYdbDriver } from './ydb-client';

// Prisma for schema and simple operations
export const prisma = new PrismaClient();

// YDB SDK for complex operations
export async function getUserAnalytics(userId: bigint) {
  const ydb = await getYdbDriver();
  return ydb.query(
    `
    SELECT u.id, COUNT(o.id) as orders, SUM(o.total) as value
    FROM users u LEFT JOIN orders o ON u.id = o.user_id
    WHERE u.id = $userId
    GROUP BY u.id
  `,
    { $userId: TypedValues.uint64(userId) }
  );
}
```

#### 4.5.4 Configuring Prisma Client with Custom Connection Parameters

```typescript
// lib/prisma.ts
export const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL, // YDB compatibility endpoint if used
    },
  },
  // Connection pool for YDB's distributed latency
  connectionLimit: 20,
  queryTimeout: 30000,
});
```

---

## 5. Application Layer Adaptation and Deployment

### 5.1 Next.js 16 Application Preparation

#### 5.1.1 Auditing Vercel-Specific Features and Edge Runtime Dependencies

| **Vercel Feature**       | **Replacement Strategy**                      | **Effort** |
| :----------------------- | :-------------------------------------------- | :--------- |
| Edge Middleware          | Standard Next.js middleware (Node.js runtime) | Low        |
| Edge Functions           | API routes or Cloud Functions                 | Medium     |
| `VERCEL_URL`             | `PUBLIC_HOSTNAME` environment variable        | Low        |
| `VERCEL_ENV`             | `NODE_ENV`, `DEPLOYMENT_ENV`                  | Low        |
| Image Optimization API   | Self-hosted Sharp or Object Storage           | Medium     |
| ISR                      | Cron-triggered revalidation or on-demand      | Medium     |
| Analytics/Speed Insights | Yandex Monitoring or custom                   | Medium     |

#### 5.1.2 Replacing Vercel-Specific Environment Variables

```bash
# .env.production - Yandex Cloud deployment
NODE_ENV=production
DEPLOYMENT_ENV=production
PUBLIC_HOSTNAME=app.yourdomain.ru

# YDB connection (native SDK)
YDB_ENDPOINT=grpcs://ydb.ru-central1.yandexcloud.net:2135
YDB_DATABASE=/ru-central1/b1g.../etn...

# Or YDB PostgreSQL compatibility (if validated)
DATABASE_URL=postgresql://token@ydb-compat:5432/db?sslmode=require
```

#### 5.1.3 Configuring Standalone Output Mode for Containerization

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: false,
    loader: 'custom',
    loaderFile: './lib/image-loader.js', // Yandex Object Storage
  },
  experimental: {
    // Disable edge-specific features
    serverActions: false,
  },
};

module.exports = nextConfig;
```

### 5.2 Containerization Strategy

#### 5.2.1 Creating Production-Optimized Dockerfile

```dockerfile
# syntax=docker/dockerfile:1
FROM node:20-alpine AS base

# Dependencies stage
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Build stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Production stage
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "server.js"]
```

#### 5.2.2 Multi-Stage Build for Reduced Image Size

| **Stage** | **Purpose**                    | **Size Contribution**                  |
| :-------- | :----------------------------- | :------------------------------------- |
| `deps`    | Dependency installation        | Cached, not in final image             |
| `builder` | Compilation, static generation | Discarded after artifact extraction    |
| `runner`  | Production runtime             | **~150–250 MB final** (vs. 1GB+ naive) |

#### 5.2.3 Configuring Health Checks and Graceful Shutdown

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getYdbDriver } from '@/lib/ydb-client';

export async function GET() {
  try {
    // Database connectivity check
    await prisma.$queryRaw`SELECT 1`;
    await (await getYdbDriver()).query('SELECT 1');

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: { database: 'ok' },
    });
  } catch (error) {
    return NextResponse.json({ status: 'unhealthy', error: String(error) }, { status: 503 });
  }
}
```

### 5.3 Yandex Cloud Deployment Options

#### 5.3.1 Option A: Yandex Compute Cloud VM with Docker

##### 5.3.1.1 VM Sizing: CPU, Memory, and Disk Configuration

| **Workload Profile**             | **vCPU** | **RAM** | **Disk**   | **Estimated Cost/Month** |
| :------------------------------- | :------- | :------ | :--------- | :----------------------- |
| Development / low traffic        | 2        | 4 GB    | 50 GB SSD  | ~$30–50                  |
| Production / moderate traffic    | 4        | 8 GB    | 100 GB SSD | ~$80–120                 |
| High traffic / compute-intensive | 8        | 16 GB   | 200 GB SSD | ~$200–300                |

##### 5.3.1.2 Installing Docker and Docker Compose on Ubuntu VM

```bash
#!/bin/bash
# cloud-init/docker-install.sh

apt-get update
apt-get install -y ca-certificates curl gnupg

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

systemctl enable docker
usermod -aG docker ubuntu
```

##### 5.3.1.3 Deploying Application Container with Systemd Service

```ini
# /etc/systemd/system/nextjs-app.service
[Unit]
Description=Next.js Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/app
EnvironmentFile=/opt/app/.env

ExecStart=/usr/bin/docker compose up -d --remove-orphans
ExecStop=/usr/bin/docker compose down
ExecReload=/usr/bin/docker compose up -d --build

[Install]
WantedBy=multi-user.target
```

##### 5.3.1.4 Configuring Nginx Reverse Proxy with SSL Termination

```nginx
# /etc/nginx/sites-available/nextjs-app
server {
    listen 80;
    server_name app.yourdomain.ru;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.yourdomain.ru;

    ssl_certificate /etc/letsencrypt/live/app.yourdomain.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.yourdomain.ru/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 5.3.2 Option B: Yandex Serverless Containers

| **Characteristic** | **Configuration**             | **Consideration**                   |
| :----------------- | :---------------------------- | :---------------------------------- |
| Cold start         | 500ms–5s                      | Unacceptable for user-facing pages  |
| Max execution      | 15 minutes                    | Limits long-running operations      |
| Scaling            | 0–N automatic                 | Cost-efficient for sporadic traffic |
| Best for           | Background jobs, API webhooks | Not primary web application         |

#### 5.3.3 Option C: Yandex Cloud Functions (Limited Applicability)

**Not recommended** for Next.js 16 applications due to architectural incompatibility with integrated framework features.

### 5.4 CI/CD Pipeline Configuration

#### 5.4.1 Setting Up Yandex Cloud Container Registry

```bash
yc container registry create --name nextjs-registry

# Authenticate Docker
yc container registry configure-docker
```

#### 5.4.2 GitHub Actions Workflow for Build and Push

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Authenticate to Yandex Cloud
        uses: yc-actions/yc-iam-token@v1
        with:
          service-account-key: ${{ secrets.YC_SA_KEY }}

      - name: Build and push
        run: |
          docker build -t cr.yandex/${{ secrets.YC_REGISTRY_ID }}/nextjs-app:${{ github.sha }} .
          docker push cr.yandex/${{ secrets.YC_REGISTRY_ID }}/nextjs-app:${{ github.sha }}

      - name: Deploy to VM
        run: |
          yc compute instance update-container \
            --name nextjs-app-prod-01 \
            --container-image cr.yandex/${{ secrets.YC_REGISTRY_ID }}/nextjs-app:${{ github.sha }}
```

#### 5.4.3 Automated Deployment with Yandex Cloud CLI

```bash
# Update running container
yc compute instance update-container \
  --name nextjs-app-prod-01 \
  --container-image cr.yandex/$REGISTRY_ID/nextjs-app:$VERSION \
  --container-env KEY=VALUE
```

---

## 6. Application-Database Integration and Testing

### 6.1 Database Connection Layer Implementation

#### 6.1.1 Configuring `ydb-js` SDK for Direct YDB Access

```typescript
// lib/ydb-client.ts
import { Driver } from '@ydbjs/core';
import { IamAuthService } from '@ydbjs/auth';

let driver: Driver | null = null;

export async function getYdbDriver(): Promise<Driver> {
  if (!driver) {
    driver = new Driver({
      endpoint: process.env.YDB_ENDPOINT!,
      database: process.env.YDB_DATABASE!,
      authService: new IamAuthService(),
    });
    await driver.ready();
  }
  return driver;
}
```

#### 6.1.2 Implementing Connection Retry and Circuit Breaker Patterns

```typescript
// lib/ydb-resilience.ts
import { CircuitBreaker } from 'opossum';

const ydbBreaker = new CircuitBreaker(getYdbDriver, {
  timeout: 10000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
});

ydbBreaker.on('open', () => console.error('YDB circuit breaker opened'));
```

#### 6.1.3 Session Pool Management for High-Concurrency Scenarios

| **Parameter**       | **Value** | **Rationale**                  |
| :------------------ | :-------- | :----------------------------- |
| Min sessions        | 5         | Warm pool for baseline traffic |
| Max sessions        | 50        | Prevent resource exhaustion    |
| Keep-alive          | 60s       | Detect stale connections       |
| Acquisition timeout | 5s        | Fail fast under load           |

### 6.2 Prisma Schema and Client Adaptation

#### 6.2.1–6.2.3 Prisma Configuration

See Section 4.5 for hybrid architecture details. Key adaptations: explicit primary keys, application-managed sequences, no database-level cascade.

### 6.3 Integration Testing Strategy

| **Test Category** | **Scope**                   | **Success Criteria**            |
| :---------------- | :-------------------------- | :------------------------------ |
| Unit tests        | Prisma Client operations    | All CRUD passes                 |
| Integration tests | API endpoints with database | <100ms p95 latency              |
| Load tests        | 1000 concurrent users       | <500ms p99 latency, zero errors |
| Failover tests    | YDB AZ failure              | Automatic recovery <30s         |

### 6.4 Data Consistency Verification

- Row count matching per table
- Checksum sampling for large tables
- Application-level business rule validation
- End-to-end user journey testing

---

## 7. DNS Migration and Traffic Cutover

### 7.1 Pre-Cutover Preparation

#### 7.1.1 Lowering TTL Values on Existing DNS Records

**48 hours before cutover:** Reduce TTL to 300 seconds (5 minutes) for rapid propagation.

### 7.1.2–7.1.3 Load Balancer and SSL Configuration

Configure Yandex Cloud Load Balancer with health checks, provision SSL via Let's Encrypt or Yandex Certificate Manager.

### 7.2 DNS Record Updates

| **Record Type** | **Name** | **Value**         | **TTL** |
| :-------------- | :------- | :---------------- | :------ |
| A               | `@`      | Yandex VM/LB IP   | 300     |
| A               | `www`    | Yandex VM/LB IP   | 300     |
| CAA             | `@`      | `letsencrypt.org` | 86400   |

### 7.3 Cutover Execution

| **Phase**     | **Action**                        | **Duration** |
| :------------ | :-------------------------------- | :----------- |
| Validation    | Confirm Yandex environment health | 15 minutes   |
| DNS update    | Switch A records to Yandex        | 5 minutes    |
| Propagation   | Monitor global DNS resolution     | 5–30 minutes |
| Stabilization | Observe error rates, latency      | 2–4 hours    |

### 7.4 Post-Cutover Validation

- Global DNS propagation verification (whatsmydns.net)
- End-to-end user registration, login, core workflows
- Performance baseline establishment
- 72-hour monitoring period before Vercel decommission

---

## 8. Operational Readiness and Monitoring

### 8.1 Observability Stack Configuration

| **Component** | **Yandex Cloud Service** | **Integration**                      |
| :------------ | :----------------------- | :----------------------------------- |
| Logs          | Yandex Cloud Logging     | Structured JSON, automatic ingestion |
| Metrics       | Yandex Monitoring        | Custom dashboards, alerting          |
| Traces        | OpenTelemetry + Yandex   | Distributed request tracking         |
| APM           | Self-hosted or Yandex    | Application performance monitoring   |

### 8.2 Backup and Disaster Recovery

| **Component**    | **Strategy**                            | **RPO/RTO**        |
| :--------------- | :-------------------------------------- | :----------------- |
| YDB              | Automated daily backups + point-in-time | 24 hours / 4 hours |
| Application code | Git + Container Registry                | Immediate / 1 hour |
| User uploads     | Object Storage versioning               | Immediate / 1 hour |

### 8.3 Security Hardening

- Network ACL refinement based on observed traffic
- Encryption verification: TLS 1.3, at-rest AES-256
- Quarterly vulnerability scanning

### 8.4 Cost Optimization

| **Strategy**             | **Implementation**                      | **Expected Savings** |
| :----------------------- | :-------------------------------------- | :------------------- |
| Reserved instances       | 1-year commitment for baseline capacity | 20–30%               |
| YDB right-sizing         | Monitor and adjust provisioned capacity | 10–20%               |
| Object Storage lifecycle | Archive old backups to cold storage     | 50–70% on backups    |

---

## 9. Rollback and Contingency Planning

### 9.1 Rollback Triggers

| **Trigger**    | **Threshold**               | **Action**                 |
| :------------- | :-------------------------- | :------------------------- |
| Error rate     | >1% for 5 minutes           | Immediate DNS reversion    |
| Latency p99    | >2× baseline for 10 minutes | Evaluate, prepare rollback |
| Data integrity | Any confirmed inconsistency | Immediate full rollback    |

### 9.2 Rapid Rollback Procedures

1. **DNS reversion:** Update A records to Vercel IPs (<5 minutes)
2. **Database:** Neon remains read-only replica during cutover window
3. **Application:** Vercel deployment preserved, instant reactivation

### 9.3 Communication Plan

| **Audience**     | **Channel**      | **Timing**             |
| :--------------- | :--------------- | :--------------------- |
| Engineering team | Slack #incidents | Immediate on trigger   |
| Leadership       | Email + SMS      | Within 15 minutes      |
| Users            | Status page      | If user-visible impact |

---

## 10. Appendix: Reference Materials

### 10.1 Yandex Cloud CLI Quick Reference

```bash
# Authentication
yc init
yc config set folder-id <id>

# Service accounts
yc iam service-account create --name <name>
yc iam service-account list

# Compute
yc compute instance create --name <name> --zone <zone>
yc compute instance list

# YDB
yc ydb database create --name <name> --serverless
yc ydb database list
```

### 10.2 YQL vs. PostgreSQL Syntax

| **Operation**        | **PostgreSQL**                                | **YQL**                                             |
| :------------------- | :-------------------------------------------- | :-------------------------------------------------- |
| Create table with PK | `CREATE TABLE t (id SERIAL PRIMARY KEY, ...)` | `CREATE TABLE t (id Uint64, ..., PRIMARY KEY (id))` |
| Insert or update     | `INSERT ... ON CONFLICT ...`                  | `UPSERT INTO ...`                                   |
| Current timestamp    | `NOW()`                                       | `CurrentUtcTimestamp()`                             |
| String type          | `VARCHAR(n)`, `TEXT`                          | `Utf8`                                              |

### 10.3 Prisma Schema Migration Checklist

- [ ] All tables have explicit `@id` fields
- [ ] No `@default(autoincrement())` without YDB validation
- [ ] `@relation` cascade behavior implemented in application
- [ ] `Json` fields tested with YDB query patterns
- [ ] `Decimal` precision verified against YDB limits
- [ ] All `@db.*` native types mapped to YDB equivalents

### 10.4 Environment Variable Mapping

| **Vercel**            | **Yandex Cloud**               | **Notes**                           |
| :-------------------- | :----------------------------- | :---------------------------------- |
| `VERCEL_URL`          | `PUBLIC_HOSTNAME`              | Explicit domain configuration       |
| `VERCEL_ENV`          | `NODE_ENV`, `DEPLOYMENT_ENV`   | Standard Node.js conventions        |
| `DATABASE_URL` (Neon) | `YDB_ENDPOINT`, `YDB_DATABASE` | Or YDB PostgreSQL compatibility URL |
| `NEXT_PUBLIC_*`       | Same                           | Client-side env, no change needed   |

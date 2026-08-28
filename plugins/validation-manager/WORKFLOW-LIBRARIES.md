# Approval Workflow Libraries — Empfehlungen

**Libraries & SDKs für Production-Ready Approval Workflows**

Wir haben den Approval Service mit State Machine selbst implementiert. Hier sind Alternativen für Production:

---

## 🎯 Beste Libraries für Approval Workflows

### 1. **XState** ⭐⭐⭐⭐⭐ (EMPFOHLEN)

**Was:** Finite State Machine library für robust workflow management  
**Best For:** Complex approval chains, state transitions, error handling  
**Sprache:** TypeScript / JavaScript  

```typescript
import { createMachine, interpret } from 'xstate';

const approvalMachine = createMachine({
  id: 'approval',
  initial: 'step1_pending',
  states: {
    step1_pending: {
      on: {
        APPROVE: 'step2_pending',
        REJECT: 'draft',
      },
    },
    step2_pending: {
      on: {
        APPROVE: 'step3_pending',
        REJECT: 'draft',
      },
    },
    step3_pending: {
      on: {
        APPROVE: 'step4_pending',
        REJECT: 'draft',
      },
    },
    step4_pending: {
      on: {
        SIGN: 'completed',
        REJECT: 'draft',
      },
    },
    completed: {
      type: 'final',
    },
    draft: {
      type: 'final',
    },
  },
});

// Usage
const approvalService = interpret(approvalMachine);
approvalService.start();
approvalService.send('APPROVE');
approvalService.send('APPROVE');
approvalService.send('APPROVE');
approvalService.send('SIGN');
```

**Pros:**
- ✅ Robust state management
- ✅ Visual debugging tools
- ✅ Testable state machines
- ✅ TypeScript support
- ✅ Guards & actions
- ✅ Hierarchical states

**Cons:**
- Learning curve
- Extra dependency

**Package:** `npm install xstate`  
**Docs:** https://xstate.js.org

---

### 2. **Temporal** ⭐⭐⭐⭐⭐ (ENTERPRISE)

**Was:** Workflow engine für distributed systems  
**Best For:** Long-running workflows, retries, timeouts, durable execution  
**Sprache:** Supports Node.js, Java, Python, Go

```typescript
import * as temporal from '@temporalio/client';

@temporal.workflow
async function approvalWorkflow(requirementId: string) {
  // Step 1: QA Approval
  await temporal.activities.approveAsQA(requirementId);
  
  // Step 2: Validation Approval
  await temporal.activities.approveAsValidation(requirementId);
  
  // Step 3: Legal Approval
  await temporal.activities.approveAsLegal(requirementId);
  
  // Step 4: Digital Signature
  await temporal.activities.signDocument(requirementId);
  
  // Export to archive
  await temporal.activities.exportToArchive(requirementId);
}
```

**Pros:**
- ✅ Handles long-running workflows (days, weeks)
- ✅ Automatic retries with exponential backoff
- ✅ Timeout handling
- ✅ Durable execution (survives server restart)
- ✅ Visibility (audit trail built-in)
- ✅ Scales to millions of workflows

**Cons:**
- Requires separate Temporal server
- More complex setup
- Overkill for simple approvals

**Package:** `npm install @temporalio/client @temporalio/worker`  
**Docs:** https://docs.temporal.io

---

### 3. **Apache Airflow** ⭐⭐⭐⭐

**Was:** Workflow orchestration platform  
**Best For:** DAG-based workflows, scheduling, monitoring  
**Sprache:** Python  

```python
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime

def approve_qa(requirement_id, **context):
    # QA approval logic
    pass

def approve_validation(requirement_id, **context):
    # Validation approval logic
    pass

def sign_document(requirement_id, **context):
    # Digital signature logic
    pass

def export_to_archive(requirement_id, **context):
    # Export logic
    pass

with DAG('approval_workflow', start_date=datetime(2026, 1, 1)) as dag:
    task1 = PythonOperator(task_id='qa_approval', python_callable=approve_qa)
    task2 = PythonOperator(task_id='validation_approval', python_callable=approve_validation)
    task3 = PythonOperator(task_id='sign', python_callable=sign_document)
    task4 = PythonOperator(task_id='export', python_callable=export_to_archive)
    
    task1 >> task2 >> task3 >> task4
```

**Pros:**
- ✅ Excellent for DAG workflows
- ✅ Built-in monitoring & UI
- ✅ Scheduling & cron support
- ✅ Large community (used by Uber, Airbnb, Netflix)

**Cons:**
- Python only
- Requires separate Airflow server
- Heavier than needed for simple approvals

**Installation:** `pip install apache-airflow`  
**Docs:** https://airflow.apache.org

---

### 4. **n8n** ⭐⭐⭐⭐

**Was:** Workflow automation platform (open-source)  
**Best For:** No-code/low-code workflows, integrations  
**Sprache:** Node.js-based, UI-driven

```yaml
# n8n workflow (YAML export)
- name: "Approval Workflow"
  nodes:
    - name: "Webhook Trigger"
      type: "webhook"
      operation: "POST /approval"
    
    - name: "QA Approval"
      type: "wait"
      waitType: "manual"
    
    - name: "Validation Approval"
      type: "wait"
      waitType: "manual"
    
    - name: "Export to Archive"
      type: "executeCommand"
      command: "node /scripts/export.js"
  
  connections:
    - from: "Webhook Trigger"
      to: "QA Approval"
    - from: "QA Approval"
      to: "Validation Approval"
    - from: "Validation Approval"
      to: "Export to Archive"
```

**Pros:**
- ✅ No-code UI for building workflows
- ✅ Easy integration with external systems
- ✅ Self-hosted
- ✅ Good for non-developers

**Cons:**
- Less flexible than code-based
- Requires n8n server
- Smaller community

**Setup:** Docker: `docker run -it -p 5678:5678 n8nio/n8n`  
**Docs:** https://docs.n8n.io

---

### 5. **BullMQ** ⭐⭐⭐

**Was:** Queue-based job processor  
**Best For:** Background jobs, async workflows  
**Sprache:** Node.js

```typescript
import { Queue } from 'bullmq';

const approvalQueue = new Queue('approvals', {
  connection: {
    host: 'localhost',
    port: 6379,
  },
});

// Add job to queue
await approvalQueue.add('approve-requirement', {
  requirementId: 'URS-001',
  userRole: 'QA_LEAD',
  comment: 'Looks good',
});

// Process jobs
approvalQueue.process('approve-requirement', async (job) => {
  const { requirementId, userRole, comment } = job.data;
  
  // Approval logic
  const result = await approvalService.approveRequirement(
    requirementId,
    userRole,
    comment
  );
  
  // On success, queue next step
  if (result.success && result.nextStep) {
    await approvalQueue.add('move-to-next-step', {
      requirementId,
      nextStep: result.nextStep,
    });
  }
  
  return result;
});
```

**Pros:**
- ✅ Lightweight
- ✅ Redis-based (fast)
- ✅ Good for sequential jobs
- ✅ Retry & backoff built-in

**Cons:**
- Less visual feedback
- Requires Redis
- Limited monitoring

**Package:** `npm install bullmq redis`  
**Docs:** https://docs.bullmq.io

---

### 6. **Zeebe** ⭐⭐⭐

**Was:** Process engine for distributed systems  
**Best For:** BPMN-based workflows, enterprise  
**Sprache:** Java, Node.js, Python, Go

```typescript
const { ZBClient } = require('zeebe-node');

const zbc = new ZBClient({
  hostname: 'localhost',
  port: 26500,
});

// Deploy BPMN workflow
await zbc.deployWorkflow('./approval-workflow.bpmn');

// Create workflow instance
await zbc.createWorkflowInstance('ApprovalWorkflow', {
  requirementId: 'URS-001',
});

// Subscribe to workflow events
zbc.subscribeToWorkflowRequests(async (task) => {
  if (task.jobType === 'approveAsQA') {
    // QA approval logic
    task.complete({
      status: 'approved',
    });
  }
});
```

**Pros:**
- ✅ BPMN 2.0 standard
- ✅ Enterprise-grade
- ✅ Kubernetes-native
- ✅ Horizontally scalable

**Cons:**
- Complex setup
- Requires Java runtime
- Learning curve

**Docs:** https://camunda.com/platform/zeebe

---

## 🏗️ Architektur-Vergleich

| Feature | XState | Temporal | Airflow | n8n | BullMQ | Zeebe |
|---------|--------|----------|---------|-----|--------|-------|
| **Setup Complexity** | ⭐ Low | ⭐⭐⭐⭐ High | ⭐⭐⭐ Medium | ⭐⭐ Low | ⭐ Low | ⭐⭐⭐⭐ High |
| **For Approvals** | ⭐⭐⭐⭐⭐ Best | ⭐⭐⭐⭐ Good | ⭐⭐⭐ OK | ⭐⭐⭐ OK | ⭐⭐⭐ OK | ⭐⭐⭐⭐ Good |
| **Code-based** | ✅ Yes | ✅ Yes | ✅ Python | ❌ No | ✅ Yes | ✅ Yes |
| **Scaling** | ⭐⭐⭐ Medium | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐⭐ Excellent | ⭐⭐⭐ Medium | ⭐⭐⭐ Medium | ⭐⭐⭐⭐ Excellent |
| **Learning Curve** | ⭐ Easy | ⭐⭐⭐⭐ Hard | ⭐⭐⭐ Medium | ⭐ Easy | ⭐ Easy | ⭐⭐⭐ Medium |
| **Community** | ⭐⭐⭐⭐⭐ Large | ⭐⭐⭐⭐ Large | ⭐⭐⭐⭐⭐ Huge | ⭐⭐⭐ Medium | ⭐⭐⭐⭐ Large | ⭐⭐⭐ Medium |
| **Enterprise** | ⭐⭐⭐ Good | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐ Good | ⭐⭐ Basic | ⭐⭐⭐⭐⭐ Excellent |

---

## ✅ Unsere Empfehlung für MVP

### **Phase 1: MVP (Jetzt) → Custom Service**
```typescript
// Use our custom ApprovalService + DocumentExportService
// No external dependencies, full control
// Already implemented in this plugin
```

**Warum?**
- ✅ Schnell zu implementieren (bereits done)
- ✅ Keine neue Infrastruktur nötig
- ✅ Vollständige Kontrolle über Workflow
- ✅ Für bis zu 1000 concurrent approvals genug

**Nachteile:**
- ❌ Manuell restart handling
- ❌ Keine built-in retry logic
- ❌ Timeouts sind einfach

---

### **Phase 2: Skalierung → XState**

Wenn wir skalieren möchten (aber noch keine separate Server-Infrastruktur):

```typescript
npm install xstate
```

```typescript
import { createMachine, interpret } from 'xstate';
import { approvalService } from './approvalService';

const approvalMachine = createMachine({
  id: 'requirement-approval',
  initial: 'qa_pending',
  context: { requirementId: '', attempts: 0 },
  
  states: {
    qa_pending: {
      on: {
        APPROVE: { target: 'validation_pending', actions: 'logApproval' },
        REJECT: { target: 'draft' },
        TIMEOUT: { target: 'escalated' },
      },
      after: { 5000: 'escalated' }, // 5 second timeout for demo
    },
    validation_pending: {
      on: {
        APPROVE: { target: 'legal_pending', actions: 'logApproval' },
        REJECT: { target: 'draft' },
      },
    },
    legal_pending: {
      on: {
        APPROVE: { target: 'signature_pending', actions: 'logApproval' },
        REJECT: { target: 'draft' },
      },
    },
    signature_pending: {
      on: {
        SIGN: { target: 'completed', actions: 'exportDocument' },
      },
    },
    completed: {
      type: 'final',
    },
    draft: {
      type: 'final',
    },
    escalated: {
      on: {
        REASSIGN: { target: 'qa_pending' },
        CANCEL: { target: 'draft' },
      },
    },
  },
});

const approvalInterpreter = interpret(approvalMachine)
  .onTransition((state) => console.log('State:', state.value))
  .start();
```

---

### **Phase 3: Enterprise → Temporal**

Wenn wir multi-day workflows, retries, und enterprise SLA brauchen:

```typescript
npm install @temporalio/client @temporalio/worker @temporalio/activity
```

```typescript
import { proxyActivities } from '@temporalio/workflow';

export async function approvalWorkflow(input: ApprovalInput) {
  const { approveAsQA, approveAsValidation, approveAsLegal, sign, exportDoc } = proxyActivities<typeof activities>({
    startToCloseTimeout: '5 minutes',
    retryPolicy: { maximumAttempts: 3 },
  });

  // QA approval (with automatic retry)
  await approveAsQA(input.requirementId);
  
  // Validation approval
  await approveAsValidation(input.requirementId);
  
  // Legal approval
  await approveAsLegal(input.requirementId);
  
  // Digital signature
  await sign(input.requirementId);
  
  // Export to archive
  await exportDoc(input.requirementId);
}
```

---

## 📋 Entscheidung-Matrix

**Wähle basierend auf deinen Anforderungen:**

```
Für MVP (< 100 concurrent):
  ✅ Custom Service (was wir gebaut haben)
  
Für Skalierung (100-1000 concurrent):
  ✅ Custom Service + Redis/BullMQ für async
  
Für höchste Zuverlässigkeit:
  ✅ XState für state management
  
Für Enterprise (> 1000, multi-day, SLAs):
  ✅ Temporal für durable execution
  
Für No-Code/Non-Developers:
  ✅ n8n für visual workflows
```

---

## 🚀 Implementation Plan

### Für Phase 1 (MVP) — Jetzt starten:

```bash
# Was wir bereits haben:
✅ approvalService.ts        # State management
✅ documentExportService.ts   # Document export
✅ admin.ts                   # Role definitions

# Was noch fehlt:
❌ Express API routes (approval endpoints)
❌ Database (store workflow state)
❌ Frontend (approval UI)
❌ Notifications (email/in-app)
```

### Für Phase 2 (Skalierung) — Wenn nötig:

```bash
# Add:
npm install xstate

# Replace approvalService.ts with XState-based version
# Add Redis for distributed state
# Add message queues for async processing
```

### Für Phase 3 (Enterprise) — Später:

```bash
# Add:
npm install @temporalio/client @temporalio/worker

# Rewrite workflows with Temporal SDK
# Deploy Temporal server (Kubernetes)
# Add workflow versioning & schema evolution
```

---

## 📊 Cost Comparison (Annual)

| Library | Setup | Monthly | Year | Notes |
|---------|-------|---------|------|-------|
| **Custom Service** | $0 | $0 | $0 | + Ops burden |
| **Custom + Redis** | $100 | $20 | $240 | Self-hosted |
| **XState + Redis** | $200 | $20 | $440 | + Licensing |
| **n8n (Self-hosted)** | $500 | $50 | $1,100 | Cloud: $500/mo |
| **Temporal Cloud** | $0 | $500 | $6,000 | Enterprise SLA |
| **Zeebe (Cloud)** | $0 | $400 | $4,800 | Camunda platform |

---

## ✨ Nächste Schritte

1. **Jetzt:** Verwende unseren Custom ApprovalService + DocumentExportService
2. **Nach Phase 1:** Evaluiere XState für besseres state management
3. **Nach Phase 2:** Wenn Skalierung nötig → Redis + BullMQ hinzufügen
4. **Nach Phase 3:** Wenn Enterprise Anforderungen → Temporal oder Zeebe

---

## 🔗 Useful Links

- **XState Visualizer:** https://stately.ai/viz
- **Temporal Playground:** https://play.temporal.io
- **n8n Demo:** https://demo.n8n.io
- **BullMQ Dashboard:** https://bull.js.org/#/uis

---

**Zusammenfassung:**
Wir haben bereits einen **robusten Custom Approval Service** implementiert. Für MVP reicht das völlig aus. Später, wenn Skalierung nötig wird, können wir einfach XState oder Temporal hinzufügen, ohne Code zu brechen.

✅ **MVP ist ready, keine externen Dependencies nötig**

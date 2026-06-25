export type WorkflowTriggerType = 'manual' | 'timer' | 'event'

export type WorkflowNodeType = 'trigger' | 'command' | 'js' | 'condition' | 'llm' | 'plugin'

export type WorkflowRunStatus = 'success' | 'failed' | 'running'

export type WorkflowNodeStatus = 'success' | 'failed' | 'skipped'

export type WorkflowNodeFieldType = 'text' | 'textarea' | 'number' | 'boolean' | 'json' | 'any'

export interface WorkflowNodeFieldRecord {
    name: string
    title?: string
    type: WorkflowNodeFieldType
    value?: any
    defaultValue?: any
}

export interface WorkflowNodeRecord {
    id: string
    type: WorkflowNodeType
    title?: string
    x?: number
    y?: number
    properties?: Record<string, any> & {
        inputFields?: WorkflowNodeFieldRecord[]
        outputFields?: WorkflowNodeFieldRecord[]
    }
}

export interface WorkflowEdgeRecord {
    id?: string
    sourceNodeId: string
    targetNodeId: string
    sourceAnchorId?: string
}

export interface WorkflowGraphRecord {
    nodes: WorkflowNodeRecord[]
    edges: WorkflowEdgeRecord[]
}

export interface WorkflowRecord {
    id: string
    name: string
    enabled: boolean
    data: WorkflowGraphRecord
    createdAt: number
    updatedAt: number
}

export interface WorkflowNodeRunRecord {
    id: string
    type: WorkflowNodeType
    status: WorkflowNodeStatus
    message: string
    startedAt: number
    endedAt: number
    output?: any
    outputs?: Record<string, any>
}

export interface WorkflowRunRecord {
    id: string
    workflowId: string
    workflowName: string
    status: WorkflowRunStatus
    triggerType: WorkflowTriggerType
    eventName?: string
    startedAt: number
    endedAt?: number
    message: string
    nodes: WorkflowNodeRunRecord[]
}

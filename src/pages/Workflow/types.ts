export type WorkflowNodeType = 'trigger' | 'command' | 'js' | 'condition' | 'llm' | 'plugin'

export type WorkflowNodeFieldType = 'text' | 'textarea' | 'number' | 'boolean' | 'json' | 'any'

export interface WorkflowNodeField {
    name: string
    title?: string
    type: WorkflowNodeFieldType
    value?: any
    defaultValue?: any
}

export interface WorkflowNode {
    id: string
    type: WorkflowNodeType
    title: string
    x: number
    y: number
    properties: Record<string, any> & {
        inputFields?: WorkflowNodeField[]
        outputFields?: WorkflowNodeField[]
    }
}

export interface WorkflowEdge {
    sourceNodeId: string
    targetNodeId: string
    sourceAnchorId?: string
}

export interface WorkflowNodeTypeOption {
    type: WorkflowNodeType
    title: string
}

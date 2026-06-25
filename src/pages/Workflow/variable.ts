import { WorkflowEdge, WorkflowNode, WorkflowNodeField } from './types'

export interface WorkflowVariableOption {
    nodeId: string
    nodeTitle: string
    fieldName: string
    fieldTitle: string
    token: string
}

const getAncestors = (nodeId: string, edges: WorkflowEdge[]) => {
    const visited = new Set<string>()
    const distance = new Map<string, number>()
    const queue = [nodeId]
    visited.add(nodeId)
    distance.set(nodeId, 0)
    while (queue.length) {
        const current = queue.shift()!
        edges.forEach((edge) => {
            if (edge.targetNodeId !== current || visited.has(edge.sourceNodeId)) return
            visited.add(edge.sourceNodeId)
            distance.set(edge.sourceNodeId, (distance.get(current) || 0) + 1)
            queue.push(edge.sourceNodeId)
        })
    }
    visited.delete(nodeId)
    return Array.from(visited).sort((a, b) => (distance.get(a) || 0) - (distance.get(b) || 0))
}

const fieldLabel = (field: WorkflowNodeField) => field.title || field.name

export const listWorkflowVariables = (
    selectedNode: WorkflowNode | null,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
): WorkflowVariableOption[] => {
    if (!selectedNode) return []
    return getAncestors(selectedNode.id, edges).flatMap((id) => {
        const node = nodes.find((item) => item.id === id)
        if (!node) return []
        return (node.properties.outputFields || []).map((field) => ({
            nodeId: node.id,
            nodeTitle: node.title,
            fieldName: field.name,
            fieldTitle: fieldLabel(field),
            token: '${' + node.title + '.' + field.name + '}',
        }))
    })
}

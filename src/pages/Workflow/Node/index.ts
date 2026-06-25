import { WorkflowNodeType } from '../types'
import TriggerNodeConfig from './Trigger/ConfigPanel.vue'
import CommandNodeConfig from './Command/ConfigPanel.vue'
import JsNodeConfig from './Js/ConfigPanel.vue'
import ConditionNodeConfig from './Condition/ConfigPanel.vue'
import LlmNodeConfig from './Llm/ConfigPanel.vue'
import PluginNodeConfig from './Plugin/ConfigPanel.vue'

export { iconText, nodeTypeTitle, subTitle } from './shared'
export { TriggerNodeConfig, CommandNodeConfig, JsNodeConfig, ConditionNodeConfig, LlmNodeConfig, PluginNodeConfig }

/** 节点类型 → 配置组件映射 */
export const nodeConfigComponents: Record<WorkflowNodeType, any> = {
    trigger: TriggerNodeConfig,
    command: CommandNodeConfig,
    js: JsNodeConfig,
    condition: ConditionNodeConfig,
    llm: LlmNodeConfig,
    plugin: PluginNodeConfig,
}

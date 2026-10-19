import { Model } from '../types'
import { systemAggregatorModels } from './systemAggregator'
import { systemDomesticModels } from './systemDomestic'
import { systemGlobalModels } from './systemGlobal'

export { getModelLogo } from './logo'

export const SystemModels: Record<string, Partial<Model>[]> = {
    ...systemGlobalModels,
    ...systemDomesticModels,
    ...systemAggregatorModels,
}

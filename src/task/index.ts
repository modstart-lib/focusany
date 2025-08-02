import {useTaskStore} from "../store/modules/task";
import {nextTick} from "vue";

const taskStore = useTaskStore();

export const TaskManager = {
    init() {
        // taskStore.register('SoundTts', SoundTts)
        // taskStore.register('SoundClone', SoundClone)
        // taskStore.register('VideoGen', VideoGen)
        nextTick(async () => {
            //     await SoundTts.restore?.()
            //     await SoundClone.restore?.()
            //     await VideoGen.restore?.()
        }).then();
        // taskStore.register('TestSync', TestSync)
        // taskStore.register('TestAsync', TestAsync)
        // setInterval(async () => {
        //     // await taskStore.dispatch('TestSync', StringUtil.random())
        //     await taskStore.dispatch('TestAsync', StringUtil.random(), {
        //         'a': 1,
        //     }, {
        //         timeout: 3 * 1000,
        //     })
        // }, 10 * 1000)
    },
    count() {
        return taskStore.records.length;
    },
};

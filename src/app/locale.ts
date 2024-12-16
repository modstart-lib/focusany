import zhCN from '@arco-design/web-vue/es/locale/lang/zh-cn';
import enUS from '@arco-design/web-vue/es/locale/lang/en-us';
import {onLocaleChange} from "../lang"
import {ref} from "vue";

export const useLocale = () => {
    const locales = {
        'zh-CN': zhCN,
        'en-US': enUS,
    };
    const locale = ref(zhCN);
    onLocaleChange((newLocale) => {
        locale.value = locales[newLocale];
    });
    return {
        locale: locale,
    }
}

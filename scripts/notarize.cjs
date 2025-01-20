const {notarize} = require("@electron/notarize");

exports.default = async function notarizing(context) {
    const appName = context.packager.appInfo.productFilename;
    const {electronPlatformName, appOutDir} = context;
    // We skip notarization if the process is not running on MacOS and
    // if the enviroment variable SKIP_NOTARIZE is set to `true`
    // This is useful for local testing where notarization is useless
    if (
        electronPlatformName !== "darwin" ||
        process.env.SKIP_NOTARIZE === "true"
    ) {
        console.log(`  • Skipping notarization`);
        return;
    }

    // THIS MUST BE THE SAME AS THE `appId` property
    // in your electron builder configuration
    const appId = "FocusAny";

    let appPath = `${appOutDir}/${appName}.app`;
    let {APPLE_ID, APPLE_ID_PASSWORD, APPLE_TEAM_ID} = process.env;
    console.log(`  • Notarizing ${appPath}`);

    return await notarize({
        tool: "notarytool",
        appBundleId: appId,
        appPath,
        appleId: APPLE_ID,
        appleIdPassword: APPLE_ID_PASSWORD,
        teamId: APPLE_TEAM_ID,
    });
};

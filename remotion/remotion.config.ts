import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
Config.setConcurrency(4);
// Sandbox/CI ortamlarinda onceden kurulu Chromium'u kullanmak icin:
// REMOTION_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium npx remotion render ...
if (process.env.REMOTION_BROWSER_EXECUTABLE) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER_EXECUTABLE);
}

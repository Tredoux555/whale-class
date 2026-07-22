import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setChromiumOpenGlRenderer('angle');
// Modern Chrome removed old-headless — chrome-for-testing is required.
Config.setChromeMode('chrome-for-testing');
// Never let Remotion download a browser: pin the executable from the
// environment when provided (container / Docker image sets this).
if (process.env.REMOTION_BROWSER_EXECUTABLE) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER_EXECUTABLE);
}
Config.setConcurrency(2);

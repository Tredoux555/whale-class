import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setChromiumOpenGlRenderer('angle');
// The sandbox Chromium is full Chrome (old headless removed) -> use new-headless mode.
Config.setChromeMode('chrome-for-testing');
// Use the sandbox's pre-installed Chromium — never let Remotion download one.
Config.setBrowserExecutable('/opt/pw-browsers/chromium-1194/chrome-linux/chrome');
Config.setConcurrency(2);

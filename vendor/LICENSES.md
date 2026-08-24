# Vendored browser runtime files

The JavaScript files in this directory are exact browser distributions retained so the portfolio can load without a third-party script CDN.

- GSAP 3.13.0: `gsap.min.js`, `ScrollTrigger.min.js`, `ScrollToPlugin.min.js`, and `SplitText.min.js` from https://www.npmjs.com/package/gsap/v/3.13.0. Use is subject to the GSAP standard license: https://gsap.com/standard-license/.
- Lenis 1.1.14: `lenis.min.js` from https://www.npmjs.com/package/lenis/v/1.1.14, licensed under MIT: https://github.com/darkroomengineering/lenis/blob/v1.1.14/LICENSE.

Do not update a file here by hand. Replace it only with the matching upstream distribution, update this file with the exact version, and rerun the launch checks.

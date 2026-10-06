import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(path.join(repositoryRoot, "apps/next-app/package.json"));
const sharp = require("sharp");
const outputRoot = path.join(repositoryRoot, "apps/next-app/public/model-samples");

const frame = (defs, shapes) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="768" height="768" viewBox="0 0 768 768">
  <defs>${defs}</defs>
  <rect width="768" height="768" fill="#fff"/>
  ${shapes}
</svg>
`;

// These are original vector drawings, authored here as inputs for image-to-3D.
// They are neither exported meshes nor claims that 3D generation has completed.
const references = {
  mushroom: frame(`
    <radialGradient id="cap" cx="33%" cy="20%" r="85%"><stop stop-color="#ee7057"/><stop offset=".55" stop-color="#c94032"/><stop offset="1" stop-color="#9c2824"/></radialGradient>
    <linearGradient id="stem" x1="0" x2="1"><stop stop-color="#e8d1a4"/><stop offset=".38" stop-color="#fff2cf"/><stop offset="1" stop-color="#c6a373"/></linearGradient>
    <linearGradient id="underside" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#d3a674"/><stop offset="1" stop-color="#efe0b8"/></linearGradient>`, `
    <path d="M327 352 C334 416 329 461 301 555 C289 596 296 625 333 636 C362 647 419 643 444 624 C464 608 459 584 445 551 C423 495 419 416 422 350 Z" fill="url(#stem)"/>
    <path d="M165 322 C194 257 287 238 384 238 C491 238 574 278 605 326 C607 360 544 393 385 400 C234 399 174 367 165 322 Z" fill="url(#underside)"/>
    <g fill="none" stroke="#b78a61" stroke-width="5" opacity=".55"><path d="M196 341 L335 374"/><path d="M230 362 L343 380"/><path d="M279 384 L356 382"/><path d="M576 340 L424 374"/><path d="M542 363 L419 381"/><path d="M491 383 L407 385"/></g>
    <path d="M154 322 C184 199 265 129 375 125 C489 122 578 189 613 316 C621 341 593 354 555 358 C435 375 292 371 204 353 C167 346 147 339 154 322 Z" fill="url(#cap)"/>
    <ellipse cx="284" cy="213" rx="45" ry="29" transform="rotate(-22 284 213)" fill="#ffedc4"/>
    <ellipse cx="437" cy="184" rx="35" ry="22" transform="rotate(13 437 184)" fill="#fbe8bf"/>
    <ellipse cx="512" cy="266" rx="39" ry="29" transform="rotate(25 512 266)" fill="#f3dcad"/>
    <ellipse cx="364" cy="297" rx="45" ry="29" fill="#fbe8bf"/>
    <ellipse cx="218" cy="307" rx="22" ry="16" transform="rotate(-24 218 307)" fill="#f4ddaf"/>
    <path d="M347 452 C335 507 322 552 326 590" fill="none" stroke="#fff5d6" stroke-width="12" stroke-linecap="round" opacity=".55"/>
  `),
  teapot: frame(`
    <radialGradient id="body" cx="30%" cy="24%" r="82%"><stop stop-color="#a7dace"/><stop offset=".5" stop-color="#5fae9f"/><stop offset="1" stop-color="#28665f"/></radialGradient>
    <linearGradient id="handle" x1="0" x2="1"><stop stop-color="#367e73"/><stop offset=".55" stop-color="#70b6a6"/><stop offset="1" stop-color="#2d7468"/></linearGradient>
    <linearGradient id="spout" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#a1d4c7"/><stop offset=".6" stop-color="#64ac9b"/><stop offset="1" stop-color="#397f73"/></linearGradient>
    <linearGradient id="lid" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#b8e1d3"/><stop offset="1" stop-color="#4e9a87"/></linearGradient>`, `
    <path d="M496 295 C602 244 659 289 660 379 C661 470 615 522 525 500 L511 459 C575 477 614 443 615 382 C616 326 586 306 526 338 Z" fill="url(#handle)"/>
    <path d="M268 373 C222 363 182 319 158 245 L102 238 C117 357 165 427 248 451 Z" fill="url(#spout)"/>
    <ellipse cx="131" cy="242" rx="32" ry="14" transform="rotate(10 131 242)" fill="#306e62"/>
    <ellipse cx="131" cy="242" rx="23" ry="7" transform="rotate(10 131 242)" fill="#183f3b"/>
    <path d="M246 340 C253 278 308 246 387 246 C474 246 531 292 541 365 C561 468 532 558 467 592 C421 616 332 611 293 581 C239 541 223 441 246 340 Z" fill="url(#body)"/>
    <ellipse cx="385" cy="289" rx="113" ry="44" fill="#4e9b89"/>
    <path d="M276 283 C289 243 324 216 386 215 C450 215 486 240 498 283 C484 316 300 325 276 283 Z" fill="url(#lid)"/>
    <ellipse cx="386" cy="275" rx="102" ry="35" fill="url(#lid)"/>
    <path d="M370 217 L370 192 C370 174 399 174 400 192 L400 217 Z" fill="#469780"/>
    <ellipse cx="385" cy="188" rx="20" ry="13" fill="#9dd4bc"/>
    <path d="M274 373 C260 431 268 485 289 520" fill="none" stroke="#d3f1e4" stroke-width="17" stroke-linecap="round" opacity=".5"/>
    <path d="M313 575 C349 596 424 604 470 576 L463 597 C417 617 353 610 320 592 Z" fill="#276b5f"/>
  `),
  chair: frame(`
    <linearGradient id="wood" x1="0" x2="1"><stop stop-color="#bc804a"/><stop offset=".4" stop-color="#e2b578"/><stop offset="1" stop-color="#a76536"/></linearGradient>
    <linearGradient id="back" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#efc792"/><stop offset="1" stop-color="#c48b50"/></linearGradient>
    <linearGradient id="seat" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f1c78d"/><stop offset="1" stop-color="#d79752"/></linearGradient>`, `
    <path d="M439 398 L471 413 L485 629 L455 643 Z" fill="#90542d"/>
    <path d="M274 384 L304 371 L286 579 L257 592 Z" fill="#a56b3d"/>
    <path d="M285 155 L315 143 L328 423 L297 435 Z" fill="url(#wood)"/>
    <path d="M482 211 L512 198 L512 482 L482 494 Z" fill="#97592f"/>
    <path d="M285 155 L315 143 L512 198 L482 211 Z" fill="#e6bd88"/>
    <path d="M303 154 L495 205 L497 279 L306 229 Z" fill="url(#back)"/>
    <path d="M327 247 L354 254 L357 366 L329 359 Z" fill="url(#wood)"/>
    <path d="M381 261 L408 268 L410 380 L382 373 Z" fill="url(#wood)"/>
    <path d="M435 276 L462 283 L464 394 L436 387 Z" fill="url(#wood)"/>
    <path d="M238 383 L357 331 L542 391 L419 452 Z" fill="url(#seat)"/>
    <path d="M238 383 L419 452 L419 482 L240 414 Z" fill="#b47a43"/>
    <path d="M419 452 L542 391 L539 423 L419 482 Z" fill="#966132"/>
    <path d="M250 407 L281 419 L267 639 L237 629 Z" fill="url(#wood)"/>
    <path d="M398 473 L428 476 L447 674 L415 680 Z" fill="url(#wood)"/>
    <path d="M515 421 L539 409 L554 612 L529 625 Z" fill="#a06a39"/>
    <path d="M266 548 L414 603 L415 626 L263 572 Z" fill="#b17c44"/>
    <path d="M430 581 L531 531 L533 555 L432 603 Z" fill="#9a6132"/>
    <path d="M326 187 L467 225" stroke="#f8d5a7" stroke-width="6" stroke-linecap="round" opacity=".45"/>
  `),
  crate: frame(`
    <linearGradient id="front" x1="0" x2="1"><stop stop-color="#d1a064"/><stop offset="1" stop-color="#b7793c"/></linearGradient>
    <linearGradient id="side" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ab6b32"/><stop offset="1" stop-color="#805027"/></linearGradient>
    <linearGradient id="top" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#e5b879"/><stop offset="1" stop-color="#cf9958"/></linearGradient>`, `
    <path d="M166 292 L405 374 L405 651 L166 566 Z" fill="url(#front)"/>
    <path d="M405 374 L604 263 L604 541 L405 651 Z" fill="url(#side)"/>
    <path d="M166 292 L367 181 L604 263 L405 374 Z" fill="url(#top)"/>
    <g fill="none" stroke="#996430" stroke-width="6"><path d="M167 356 L405 440"/><path d="M166 421 L405 505"/><path d="M167 491 L405 575"/></g>
    <g fill="none" stroke="#663c20" stroke-width="6"><path d="M405 440 L604 329"/><path d="M405 505 L604 394"/><path d="M405 575 L604 464"/></g>
    <g fill="none" stroke="#b98246" stroke-width="5"><path d="M221 262 L460 343"/><path d="M274 232 L514 314"/><path d="M325 204 L566 286"/></g>
    <path d="M166 291 L193 301 L193 576 L166 566 Z" fill="#e2b074"/>
    <path d="M377 364 L405 374 L405 651 L377 641 Z" fill="#dda563"/>
    <path d="M577 278 L604 263 L604 541 L577 556 Z" fill="#bb8247"/>
    <path d="M178 310 L392 382 L392 409 L178 336 Z" fill="#e0ac6c"/>
    <path d="M178 533 L392 606 L392 635 L178 560 Z" fill="#d29a56"/>
    <path d="M202 528 L214 554 L370 415 L357 389 Z" fill="#edbc7a"/>
    <path d="M425 393 L586 303 L586 328 L425 418 Z" fill="#c68b4d"/>
    <path d="M425 606 L586 516 L586 541 L425 631 Z" fill="#b57b42"/>
    <path d="M429 442 L450 430 L574 513 L554 525 Z" fill="#be8548"/>
    <path d="M177 291 L367 186 L389 194 L201 301 Z" fill="#f0c48a"/>
    <path d="M386 205 L582 271 L559 284 L364 217 Z" fill="#d5a66b"/>
    <g fill="#6e4a2e"><circle cx="180" cy="324" r="4"/><circle cx="390" cy="395" r="4"/><circle cx="180" cy="548" r="4"/><circle cx="390" cy="622" r="4"/><ellipse cx="590" cy="320" rx="3" ry="4"/><ellipse cx="590" cy="529" rx="3" ry="4"/></g>
  `),
};

const records = [];
for (const [id, svg] of Object.entries(references)) {
  const directory = path.join(outputRoot, id);
  await mkdir(directory, { recursive: true });
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  await writeFile(path.join(directory, "reference.svg"), svg, "utf8");
  await writeFile(path.join(directory, "reference.png"), png);
  records.push({
    id,
    source: "Original vector drawing defined in scripts/model-samples/create-references.mjs",
    externalImageInputs: [],
    referenceSvg: `apps/next-app/public/model-samples/${id}/reference.svg`,
    referencePng: `apps/next-app/public/model-samples/${id}/reference.png`,
    width: 768,
    height: 768,
    svgSha256: createHash("sha256").update(svg).digest("hex"),
    pngSha256: createHash("sha256").update(png).digest("hex"),
  });
}

await writeFile(path.join(repositoryRoot, "scripts/model-samples/reference-provenance.json"), `${JSON.stringify({
  createdOn: "2026-10-06",
  purpose: "Original input images for the four user-approved victor/pixal3d-studio generation runs",
  threeDimensionalOutputStatus: "Not included in this reference-generation step",
  references: records,
}, null, 2)}\n`);
console.log(JSON.stringify(records.map(({ id, pngSha256 }) => ({ id, pngSha256 })), null, 2));

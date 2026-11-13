// End-to-end demo check over the Chrome DevTools Protocol (no extra deps).
// Usage: npm run e2e  (app running on :3000, freshly seeded, DEMO_PASSCODE unset; needs google-chrome)
// node --experimental-websocket scripts/e2e-smoke.mjs <baseUrl> <chromeProfileDir> <width>
import { spawn } from "node:child_process";

const BASE = process.argv[2] ?? "http://localhost:3000";
const PROFILE = process.argv[3];
const WIDTH = Number(process.argv[4] ?? 360);
const chrome = spawn("google-chrome", [
  "--headless=new", "--no-sandbox", "--disable-gpu", `--user-data-dir=${PROFILE}`,
  "--remote-debugging-port=9333", `--window-size=${WIDTH},900`, "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, id = 0;
const pending = new Map();
const consoleErrors = [];

async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch("http://127.0.0.1:9333/json")).json();
      const page = list.find((t) => t.type === "page");
      if (page) {
        ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((r) => (ws.onopen = r));
        ws.onmessage = (m) => {
          const msg = JSON.parse(m.data);
          if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
          if (msg.method === "Runtime.exceptionThrown") consoleErrors.push((msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text).slice(0,1500));
          if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description).join(" "));
        };
        return;
      }
    } catch {}
    await sleep(200);
  }
  throw new Error("no chrome");
}
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
async function evaluate(expr) {
  const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) throw new Error(`eval failed: ${expr}\n${JSON.stringify(r.result.exceptionDetails)}`);
  return r.result?.result?.value;
}
async function waitFor(expr, what, ms = 40000) {
  const t = Date.now();
  while (Date.now() - t < ms) { if (await evaluate(expr).catch(() => false)) return; await sleep(150); }
  throw new Error(`timeout waiting for: ${what}\nURL: ${await evaluate("location.href")}\nTEXT: ${(await evaluate("document.body.innerText")).slice(0, 800)}`);
}
const go = async (path) => { await send("Page.navigate", { url: BASE + path }); await sleep(300); await waitFor("document.readyState==='complete'", "load"); };
const hasText = (t) => waitFor(`document.body.innerText.includes(${JSON.stringify(t)})`, `text "${t}"`);
const click = (text, sel = "button,a") => evaluate(`(()=>{const el=[...document.querySelectorAll(${JSON.stringify(sel)})].find(e=>e.innerText.trim()===${JSON.stringify(text)}); if(!el) throw new Error('no element: ${text}'); el.click(); return true})()`);
const type = (selector, value) => evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)}); const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:el.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto,'value').set.call(el,${JSON.stringify(value)}); el.dispatchEvent(new Event(${JSON.stringify("input")},{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); return true})()`);
const noHorizontalScroll = async (label) => {
  const [sw, cw] = await evaluate("[document.documentElement.scrollWidth, document.documentElement.clientWidth]");
  if (sw > cw) throw new Error(`${label}: horizontal scroll ${sw} > ${cw}`);
};
const step = (s) => console.log("✓", s);

try {
  await connect();
  await send("Page.enable"); await send("Runtime.enable");

  // ---- Onboarding a new business (timed) ----
  const t0 = Date.now();
  await go("/onboarding");
  await hasText("What is your business called?");
  await type("input[aria-label='Business name']", "Sizwe's Phone Fix");
  await click("Computer & phone help"); await click("Next");
  await hasText("Where do you work?"); await type("input[aria-label='Area']", "Mthatha"); await click("Next");
  await click("In a notebook or on paper"); await click("Next");
  await click("Get paid on time"); await click("Next");
  await hasText("Do you keep stock"); await click("No"); await click("Next");
  await hasText("business loan"); await click("No"); await click("Next");
  await hasText("advertising"); await click("Next");
  await hasText("Who owes you money right now?");
  await type("input[placeholder='e.g. Mrs Khumalo']", "Mrs Khumalo");
  await type("input[placeholder='e.g. 450']", "450");
  await evaluate(`(()=>{const s=document.querySelector('select'); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(s,'month'); s.dispatchEvent(new Event('change',{bubbles:true})); return true})()`);
  await click("+ Add another person");
  await evaluate(`(()=>{const ins=[...document.querySelectorAll("input[placeholder='e.g. Mrs Khumalo']")]; const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; set.call(ins[1],'Bongani'); ins[1].dispatchEvent(new Event('input',{bubbles:true})); const am=[...document.querySelectorAll("input[placeholder='e.g. 450']")]; set.call(am[1],'120'); am[1].dispatchEvent(new Event('input',{bubbles:true})); return true})()`);
  await click("Finish");
  await hasText("You're set up!");
  await hasText("R570");
  await hasText("Hi Mrs Khumalo, this is Sizwe's Phone Fix");
  const wa = await evaluate(`[...document.querySelectorAll('a')].find(a=>a.innerText==='Open in WhatsApp').href`);
  if (!wa.startsWith("https://wa.me/?text=") || !decodeURIComponent(wa).includes("R450")) throw new Error("bad wa link " + wa);
  step(`onboarding → total owed R570 + reminder draft + WhatsApp link in ${((Date.now() - t0) / 1000).toFixed(1)}s of automated clicks`);
  await noHorizontalScroll("onboarding result");

  await click("Go to my home");
  await hasText("Collecting your starting point.");
  await hasText("Seed");
  await hasText("Record your sales for a week");
  step("fresh business: seed stage + 'Collecting your starting point' + record_more suggestion");

  // ---- Recording changes the metrics ----
  await go("/record/sale");
  await type("input[name='amount']", "300");
  await type("input[name='description']", "Screen replacement");
  await click("Save sale");
  await hasText("Sale saved.");
  await go("/home");
  await hasText("R300");
  await go("/record/payment");
  await evaluate(`(()=>{const s=document.querySelector('select[name=saleId]'); s.value=s.options[1].value; return true})()`);
  await type("input[name='amount']", "450");
  await click("Save payment");
  await hasText("Payment saved.");
  await go("/home");
  await hasText("R750"); // money in: 300 + 450
  await hasText("R120"); // owed: only Bongani left
  step("recording a sale and a payment updates Money in (R750) and Owed (R120)");

  // ---- Switch to the seeded demo business ----
  await evaluate(`(()=>{const s=[...document.querySelectorAll('select')].find(x=>[...x.options].some(o=>o.text==="Thandi's Tailoring")); const v=[...s.options].find(o=>o.text==="Thandi's Tailoring").value; Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(s,v); s.dispatchEvent(new Event('change',{bubbles:true})); return true})()`);
  await hasText("Remind Lindiwe M. to pay");
  await hasText("Young tree");
  await hasText("41 days");
  await noHorizontalScroll("home");
  step("switched to Thandi's Tailoring: young tree, recommendation cites R900 / 41 days");

  // ---- Recommendation → edit → approve → WhatsApp → done → outcome ----
  await click("Edit");
  await waitFor("!!document.querySelector('textarea[aria-label=\"Edit the message\"]')", "edit box");
  await type("textarea[aria-label='Edit the message']", "Hi Lindiwe, it's Thandi. Friendly reminder: R900 for the wedding guest dress is still outstanding. Thank you!");
  await click("Approve");
  await waitFor("location.pathname.startsWith('/actions/')", "action page");
  await hasText("Your message");
  const text = await evaluate("document.querySelector('#action-text').value");
  if (!text.startsWith("Hi Lindiwe, it's Thandi")) throw new Error("edit not kept: " + text);
  const link = await evaluate(`[...document.querySelectorAll('a')].find(a=>a.innerText==='Open in WhatsApp').href`);
  if (!decodeURIComponent(link).includes("Hi Lindiwe, it's Thandi")) throw new Error("wa link missing edited text");
  await click("Copy");
  step("approve keeps the edited text; WhatsApp link is prefilled; copy works");
  await click("I sent it");
  await hasText("✓ Done");
  await type("input[placeholder='e.g. She paid R500 on Friday']", "She paid R500 and will pay the rest next week");
  await click("Save");
  await hasText("What happened:");
  await hasText("You approved it");
  await hasText("You marked it done");
  await hasText("You noted what happened");
  await noHorizontalScroll("action page");
  step("mark done → outcome note → audit trail (suggested, approved, done, outcome)");

  await go("/actions");
  await hasText("Remind Lindiwe M. to pay");
  await go("/home");
  await hasText("You're up to date");
  await go("/report");
  await hasText("What changed");
  await hasText("What seemed to help");
  await noHorizontalScroll("report");
  step("actions list, home 'up to date' and report all render");

  if (consoleErrors.length) console.log("console errors:", consoleErrors);
  console.log("ALL PASSED");
} catch (e) {
  console.error("FAILED:", e.message);
  if (consoleErrors.length) console.log("console errors:", consoleErrors);
  process.exitCode = 1;
} finally {
  chrome.kill();
  ws?.close();
}

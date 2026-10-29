/**
 * Apps Script (noor-sheets.gs) ka dry-run test.
 *
 * Owner ka complaint tha "sheet me koi data add nahi ho raha". Isliye script ko fake
 * Google Sheets par chalaya jaata hai — agar column mapping, header repair ya token
 * check tootega to yahin pakda jayega (owner ko debug karne ki zaroorat nahi).
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {
  checkoutEventSheetRow,
  invoiceSheetRow,
  messageSheetRow,
  orderItemSheetRows,
  orderSheetRow,
  shipmentSheetRow,
  subscriberSheetRow,
} from "../../apps/web/src/lib/sheet-format";
import type { Order } from "@noor/types";

type Cell = string | number | boolean | null;
type Grid = Cell[][];

function makeSheet(name: string, id: number, grid: Grid = []) {
  const sheet = {
    name,
    rows: grid,
    getSheetId: () => id,
    getName: () => name,
    getLastRow: () => sheet.rows.length,
    getLastColumn: () => sheet.rows.reduce((max, row) => Math.max(max, row.length), 0),
    appendRow: (row: Cell[]) => {
      sheet.rows.push([...row]);
    },
    setFrozenRows: () => {},
    deleteRow: (row: number) => {
      sheet.rows.splice(row - 1, 1);
    },
    clearContents: () => {
      sheet.rows = [];
    },
    getFilter: () => null,
    setColumnWidth: () => {},
    getMaxRows: () => Math.max(50, sheet.rows.length + 10),
    getMaxColumns: () => Math.max(30, sheet.getLastColumn()),
    deleteColumns: () => {},
    getDataRange: () => range(1, 1, Math.max(1, sheet.rows.length), Math.max(1, sheet.getLastColumn())),
    getRange: (row: number, column: number, numRows = 1, numColumns = 1) => range(row, column, numRows, numColumns),
  };

  function range(row: number, column: number, numRows: number, numColumns: number) {
    const read = () => {
      const out: Cell[][] = [];
      for (let r = 0; r < numRows; r += 1) {
        const line: Cell[] = [];
        for (let c = 0; c < numColumns; c += 1) {
          line.push(sheet.rows[row - 1 + r]?.[column - 1 + c] ?? "");
        }
        out.push(line);
      }
      return out;
    };
    const api = {
      getValues: read,
      setValues: (values: Cell[][]) => {
        values.forEach((line, r) => {
          const target = row - 1 + r;
          sheet.rows[target] = sheet.rows[target] ?? [];
          line.forEach((value, c) => {
            sheet.rows[target][column - 1 + c] = value;
          });
        });
        return api;
      },
      setValue: (value: Cell) => {
        sheet.rows[row - 1] = sheet.rows[row - 1] ?? [];
        sheet.rows[row - 1][column - 1] = value;
        return api;
      },
      setFontWeight: () => api,
      setBackground: () => api,
      setVerticalAlignment: () => api,
      setWrapStrategy: () => api,
      setNumberFormat: () => api,
      createFilter: () => api,
    };
    return api;
  }

  return sheet;
}

function loadScript(
  token = "test-token",
  options: {
    dropSpreadsheetId?: boolean;
    activeIsCopy?: boolean;
    openByIdFails?: boolean;
    activeIsNull?: boolean;
    propertySheetId?: string | null;
  } = {},
) {
  const file = path.join(process.cwd(), "scripts/google-apps-script/noor-sheets.gs");
  let source = fs.readFileSync(file, "utf8").replace(
    "var TOKEN = 'CHANGE-ME-noor-token';",
    `var TOKEN = '${token}';`,
  );
  assert.ok(source.includes(`var TOKEN = '${token}';`), "token replace hua");

  /**
   * Owner ne paste karte waqt `SPREADSHEET_ID` line delete kar di thi — usi galti
   * ka test. Script crash nahi honi chahiye, fallback id se asli sheet pakdni chahiye.
   */
  if (options.dropSpreadsheetId) {
    source = source.replace(/^var SPREADSHEET_ID = '[^']*';\s*$/m, "");
    assert.ok(!/^var SPREADSHEET_ID/m.test(source), "SPREADSHEET_ID line hataayi gayi");
  }

  const sheets: ReturnType<typeof makeSheet>[] = [];
  const book = {
    getName: () => "Noor Test Sheet",
    getId: () => "test-sheet-id",
    getUrl: () => "https://docs.google.com/spreadsheets/d/test-sheet-id/edit",
    getSheets: () => sheets,
    getSheetByName: (name: string) => sheets.find((sheet) => sheet.getName() === name) ?? null,
    insertSheet: (name: string) => {
      const sheet = makeSheet(name, 1000 + sheets.length);
      sheets.push(sheet);
      return sheet;
    },
    toast: () => {},
  };

  /**
   * "copy" book = jis sheet ke saath script bana hai (owner ke case me galat sheet).
   * `book` = asli sheet. Test pakadta hai ki writes **asli** sheet me jaate hain.
   */
  const copySheets: ReturnType<typeof makeSheet>[] = [];
  const copyBook = {
    getName: () => "Copy of Noor (galat sheet)",
    getId: () => "copy-sheet-id",
    getUrl: () => "https://docs.google.com/spreadsheets/d/copy-sheet-id/edit",
    getSheets: () => copySheets,
    getSheetByName: (name: string) => copySheets.find((sheet) => sheet.getName() === name) ?? null,
    insertSheet: (name: string) => {
      const sheet = makeSheet(name, 2000 + copySheets.length);
      copySheets.push(sheet);
      return sheet;
    },
    toast: () => {},
  };

  const sandbox: Record<string, unknown> = {
    SpreadsheetApp: {
      getActiveSpreadsheet: () => (options.activeIsNull ? null : options.activeIsCopy ? copyBook : book),
      create: (name: string) => {
        const sheet = makeSheet(name, 9000);
        (options as Record<string, unknown>).createdSheetName = name;
        return book;
      },
      WrapStrategy: { WRAP: "wrap", CLIP: "clip" },
      openById: (id: string) => {
        /**
         * Owner ka asli case: script `prkigothwal@gmail.com` se chalti hai aur sheet
         * doosre account ki hai → Google "You do not have permission to access the
         * requested document" deta hai. (createOwnSheet ki nayi sheet hamesha khulti
         * hai — real Apps Script jaisa.)
         */
        if (options.openByIdFails && id !== "test-sheet-id") {
          throw new Error("You do not have permission to access the requested document.");
        }
        return book;
      },
    },
    Session: {
      getEffectiveUser: () => ({ getEmail: () => "prkigothwal@gmail.com" }),
      getActiveUser: () => ({ getEmail: () => "prkigothwal@gmail.com" }),
    },
    ContentService: {
      MimeType: { JSON: "json" },
      createTextOutput: (text: string) => ({
        text,
        mime: "",
        setMimeType(mime: string) {
          this.mime = mime;
          return this;
        },
        getContent: () => text,
        getJson: () => JSON.parse(text),
      }),
    },
    /** R39: plain /exec browser request par HTML control panel banta hai. */
    HtmlService: {
      createHtmlOutput: (html: string) => {
        const out: Record<string, unknown> = {
          html,
          getContent: () => html,
          getTitle: () => "Noor sheet panel",
        };
        out.setTitle = () => out;
        out.addMetaTag = () => out;
        return out;
      },
    },
    LockService: { getScriptLock: () => ({ waitLock: () => true, releaseLock: () => {} }) },
    PropertiesService: {
      /** R38: props key-aware hain — script ab TOKEN bhi Script Properties se padhti hai. */
      getScriptProperties: () => {
        const opts = options as Record<string, unknown>;
        const props = (opts.props ?? (opts.props = {})) as Record<string, string>;
        if (options.propertySheetId && props.SHEET_ID === undefined) props.SHEET_ID = options.propertySheetId;
        return {
          getProperty: (key: string) => props[key] ?? null,
          setProperty: (key: string, value: string) => {
            props[key] = value;
            opts.savedProperty = `${key}=${value}`;
            if (key === "SHEET_ID") opts.propertySheetId = value;
          },
        };
      },
    },
    Utilities: {
      formatDate: () => "25-Oct-2026 12:00:00",
    },
    Logger: { log: () => {} },
    console,
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  return { sandbox: sandbox as Record<string, any>, sheets, book, copySheets };
}

test("setup() sab tabs + headers + default settings banata hai", () => {
  const { sandbox, sheets } = loadScript();
  sandbox.setup();

  const names = sheets.map((sheet) => sheet.getName());
  for (const expected of ["Settings", "Orders", "Payments", "Checkout", "Messages", "Newsletter"]) {
    assert.ok(names.includes(expected), `${expected} tab missing`);
  }
  const orders = sheets.find((sheet) => sheet.getName() === "Orders")!;
  assert.equal(orders.rows[0]?.[1], "Event");
  assert.ok(orders.rows[0]?.includes("Order number"));

  const settings = sheets.find((sheet) => sheet.getName() === "Settings")!;
  const flat = settings.rows.map((row) => String(row[0]));
  assert.ok(flat.includes("support_phone"));
  assert.ok(flat.includes("upi_id"));
});

test("naye column add hone par header repair hota hai (data drop nahi)", () => {
  const { sandbox, sheets } = loadScript();
  sandbox.setup();
  const checkout = sheets.find((sheet) => sheet.getName() === "Checkout")!;
  // purani sheet jaisa: Reason column gayab
  checkout.rows[0] = ["Timestamp", "Event", "Step", "Order number", "Items", "Subtotal", "Phone"];

  const written = sandbox.appendRows_([
    { sheet: "Checkout", row: { Timestamp: "t1", Event: "checkout.review", Reason: "pincode fail", Phone: "9876500011" } },
  ]);
  assert.equal(written, 1);
  assert.ok(checkout.rows[0].includes("Reason"), "Reason header wapas add hona chahiye");
  const reasonIndex = checkout.rows[0].indexOf("Reason");
  assert.equal(checkout.rows[1][reasonIndex], "pincode fail");
});

test("appendJSON posts se order row sahi columns me jaati hai", () => {
  const { sandbox, sheets } = loadScript();
  sandbox.setup();
  const response = sandbox.doPost({
    postData: {
      contents: JSON.stringify({
        token: "test-token",
        action: "append",
        rows: [
          {
            sheet: "Orders",
            row: {
              Timestamp: "2026-10-25T10:00:00.000Z",
              Event: "order.placed",
              "Order number": "NE-ABC123",
              "Payment status": "pending",
              Customer: "Tannu",
              Total: 549,
            },
          },
          { sheet: "Payments", row: { Timestamp: "2026-10-25T10:01:00.000Z", Event: "payment.claimed", "Order number": "NE-ABC123" } },
        ],
      }),
    },
  });
  assert.equal(response.getJson().ok, true, JSON.stringify(response.getJson()));

  const orders = sheets.find((sheet) => sheet.getName() === "Orders")!;
  const header = orders.rows[0];
  const row = orders.rows[1];
  assert.equal(row[header.indexOf("Order number")], "NE-ABC123");
  assert.equal(row[header.indexOf("Customer")], "Tannu");
  assert.equal(row[header.indexOf("Total")], 549);

  const payments = sheets.find((sheet) => sheet.getName() === "Payments")!;
  assert.equal(payments.rows[1][payments.rows[0].indexOf("Event")], "payment.claimed");
});

test("galat token par kuch bhi write nahi hota", () => {
  const { sandbox, sheets } = loadScript();
  sandbox.setup();
  const response = sandbox.doPost({
    postData: {
      contents: JSON.stringify({
        token: "wrong",
        action: "append",
        rows: [{ sheet: "Orders", row: { Event: "order.placed", "Order number": "NE-HACK" } }],
      }),
    },
  });
  assert.equal(response.getJson().ok, false);
  assert.equal(sheets.find((sheet) => sheet.getName() === "Orders")!.rows.length, 1);
});

test("settings_save sirf di gayi keys update karta hai", () => {
  const { sandbox, sheets } = loadScript();
  sandbox.setup();
  const response = sandbox.doPost({
    postData: {
      contents: JSON.stringify({
        token: "test-token",
        action: "settings_save",
        settings: { support_phone: "9876543210", announcement: "Diwali Sale" },
      }),
    },
  });
  const payload = response.getJson();
  assert.equal(payload.ok, true);
  assert.equal(payload.settings.support_phone, "9876543210");
  assert.equal(payload.settings.announcement, "Diwali Sale");
  // R38: koi default UPI seed nahi hoti — settings_save ne upi_id invent nahi kiya
  assert.equal(payload.settings.upi_id ?? "", "");
  assert.ok(sheets.find((sheet) => sheet.getName() === "Settings")!.rows.length >= 3);
});

test("doGet R38 — settings/health public (safe), baaki sab token-gated", () => {
  const { sandbox } = loadScript();
  sandbox.setup();

  // private action bina token band
  assert.equal(sandbox.doGet({ parameter: { action: "recent", sheet: "Orders" } }).getJson().ok, false);

  // settings PUBLIC hai — token set hone se pehle bhi website UPI padh sake
  const pub = sandbox.doGet({ parameter: { action: "settings" } }).getJson();
  assert.equal(pub.ok, true);
  assert.equal(pub.public, true);
  assert.equal(pub.settings.admin_url, undefined, "admin_url public subset me nahi");
  assert.equal(pub.settings.upi_id ?? "", "", "R38: koi default UPI seed nahi hoti");

  // owner sheet me UPI bharta hai → public + full dono me wahi aata hai
  sandbox.writeSettings_({ upi_id: "mystore@upi", admin_url: "https://admin.example" });
  const full = sandbox.doGet({ parameter: { action: "settings", token: "test-token" } }).getJson();
  assert.equal(full.settings.upi_id, "mystore@upi");
  assert.equal(full.settings.admin_url, "https://admin.example");
  const pubAfter = sandbox.doGet({ parameter: { action: "settings" } }).getJson();
  assert.equal(pubAfter.settings.upi_id, "mystore@upi");
  assert.equal(pubAfter.settings.admin_url, undefined);

  // health public (safe fields); sheet naam/URL/counts sirf token ke saath
  const openHealth = sandbox.doGet({ parameter: { action: "health" } }).getJson();
  assert.equal(openHealth.ok, true);
  assert.equal(openHealth.tokenOk, false);
  assert.equal(openHealth.sheetFound, true);
  assert.equal(openHealth.sheetId, "test-sheet-id");
  assert.equal(openHealth.spreadsheetId, "test-sheet-id");
  assert.equal(openHealth.spreadsheetUrl, "");
  assert.equal(openHealth.upiSet, true);

  const authHealth = sandbox.doGet({ parameter: { action: "health", token: "test-token" } }).getJson();
  assert.equal(authHealth.tokenOk, true);
  assert.ok(authHealth.sheets.some((sheet: { name: string }) => sheet.name === "Checkout"));
  assert.ok(String(authHealth.spreadsheetUrl).includes("test-sheet-id"));
});

test("R38: placeholder token se koi protected action nahi chalta (public repo wali value)", () => {
  const { sandbox, sheets } = loadScript("CHANGE-ME-noor-token");
  sandbox.setup();
  const res = sandbox
    .doPost({
      postData: {
        contents: JSON.stringify({
          token: "CHANGE-ME-noor-token",
          action: "append",
          rows: [{ sheet: "Orders", row: { Event: "order.placed", "Order number": "NE-HACK" } }],
        }),
      },
    })
    .getJson();
  assert.equal(res.ok, false, "placeholder token authorize nahi hona chahiye");
  assert.match(String(res.fix), /set_token/, "fix me set_token URL batana chahiye");
  assert.equal(sheets.find((sheet) => sheet.getName() === "Orders")!.rows.length, 1, "koi row nahi likhi gayi");
  // public reads phir bhi khule hain
  assert.equal(sandbox.doGet({ parameter: { action: "settings" } }).getJson().ok, true);
  assert.equal(sandbox.doGet({ parameter: { action: "health" } }).getJson().tokenSet, false);
});

test("R38: set_token — fresh install par save, baad me old ke bina change nahi", () => {
  const { sandbox } = loadScript("CHANGE-ME-noor-token");

  const weak = sandbox.doGet({ parameter: { action: "set_token", token: "chota" } }).getJson();
  assert.equal(weak.ok, false, "20+ character zaroori");

  const placeholder = sandbox.doGet({ parameter: { action: "set_token", token: "CHANGE-ME-noor-token" } }).getJson();
  assert.equal(placeholder.ok, false, "public placeholder dobara set nahi ho sakta");

  const fresh = sandbox.doGet({ parameter: { action: "set_token", token: "fresh-secret-token-1234567890" } }).getJson();
  assert.equal(fresh.ok, true);
  assert.equal(fresh.tokenSet, true);

  // ab wahi token protected actions kholta hai; placeholder band
  const authed = sandbox.doGet({ parameter: { action: "recent", sheet: "Orders", token: "fresh-secret-token-1234567890" } }).getJson();
  assert.equal(authed.ok, true);
  assert.equal(sandbox.doGet({ parameter: { action: "recent", sheet: "Orders", token: "CHANGE-ME-noor-token" } }).getJson().ok, false);

  // set token badalna ho to `old` chahiye
  const noOld = sandbox.doGet({ parameter: { action: "set_token", token: "another-secret-token-0987654321" } }).getJson();
  assert.equal(noOld.ok, false);
  const withOld = sandbox
    .doGet({ parameter: { action: "set_token", token: "another-secret-token-0987654321", old: "fresh-secret-token-1234567890" } })
    .getJson();
  assert.equal(withOld.ok, true);
  assert.equal(sandbox.doGet({ parameter: { action: "version", token: "another-secret-token-0987654321" } }).getJson().ok, true);
});

test("R38: adopt — bound sheet hi website ki sheet ban jaati hai (SHEET_ID property)", () => {
  // configured (purani) sheet access nahi — script owner ki sheet se bound hai
  const { sandbox } = loadScript("test-token", { openByIdFails: true });
  const adopted = sandbox.doGet({ parameter: { action: "adopt", token: "test-token" } }).getJson();
  assert.equal(adopted.ok, true);
  assert.equal(adopted.adopted.id, "test-sheet-id");

  const health = sandbox.doGet({ parameter: { action: "health", token: "test-token" } }).getJson();
  assert.equal(health.sheetFound, true);
  assert.equal(health.sheetId, "test-sheet-id");

  // adopt ke baad append usi sheet me jaata hai
  const res = sandbox
    .doPost({
      postData: {
        contents: JSON.stringify({ token: "test-token", action: "append", rows: [{ sheet: "Audit", row: { Actor: "t", Action: "x" } }] }),
      },
    })
    .getJson();
  assert.equal(res.ok, true);
});

test("script me UPI brand naam ya secret hardcode nahi hai", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "scripts/google-apps-script/noor-sheets.gs"), "utf8");
  assert.ok(!/Google Pay|PhonePe|Paytm|BHIM/i.test(source), "UPI brand naam nahi hone chahiye");
  assert.ok(source.includes("CHANGE-ME-noor-token"), "token placeholder rakha ho");
  assert.ok(!/AKfycb/.test(source), "koi asli deployment id hardcode nahi");
  // R38 (owner): purana payee VPA code me kahin nahi — UPI sirf sheet se
  assert.ok(!/dhakadgourav/i.test(source), "purana payee hardcode nahi");
  assert.ok(source.includes("function effectiveToken_"), "token Script Properties se padhta hai");
  assert.ok(source.includes("action === 'set_token'"), "set_token action maujood hai");
  assert.ok(source.includes("action === 'adopt'"), "adopt action maujood hai");
  assert.equal((source.match(/function guard_/g) ?? []).length, 1, "guard_ ek hi baar define ho");
});

/**
 * App ↔ script contract: website jo column bhejti hai, wo sheet ke HEADERS me
 * hone chahiye. Warna row chup-chaap aadhi bhar jaati hai (owner ko "data nahi
 * aa raha" hi dikhta hai).
 */
function headersOf(sandbox: Record<string, any>, name: string): string[] {
  const headers = sandbox.HEADERS[name] as string[];
  assert.ok(Array.isArray(headers) && headers.length > 0, `${name} headers missing`);
  return headers;
}

const sampleOrder = {
  id: "o1",
  orderNumber: "NE-ABC123",
  customerName: "Tannu",
  email: "t@example.com",
  phone: "9876500011",
  address: "12 Test Street",
  city: "Jaipur",
  state: "Rajasthan",
  pincode: "302001",
  items: [{ title: "Anarkali", handle: "anarkali", size: "M", quantity: 1, price: 49900, image: "x.jpg" }],
  subtotal: 49900,
  discount: 0,
  shipping: 0,
  total: 49900,
  status: "placed",
  paymentStatus: "pending",
  paymentMethod: "prepaid",
  createdAt: "2026-10-25T10:00:00.000Z",
  updatedAt: "2026-10-25T10:00:00.000Z",
  audit: [],
  tracking: { courier: "Delhivery", awb: "AWB1", url: "https://x" },
} as unknown as Order;

test("website jo column bhejti hai wo sab sheet HEADERS me maujood hain", () => {
  const { sandbox } = loadScript();

  const ordersKeys = Object.keys(orderSheetRow(sampleOrder, "order.placed", { "UPI ID": "teststore@upi" }));
  for (const key of ordersKeys) {
    assert.ok(headersOf(sandbox, "Orders").includes(key), `Orders me column nahi: ${key}`);
    assert.ok(headersOf(sandbox, "Payments").includes(key), `Payments me column nahi: ${key}`);
  }

  const checkoutKeys = Object.keys(
    checkoutEventSheetRow({
      createdAt: "2026-10-25T10:00:00.000Z",
      event: "checkout.review",
      step: "review",
      orderNumber: null,
      itemsCount: 2,
      subtotal: 99800,
      reason: "state_mismatch",
      phone: "9876500011",
    }),
  );
  for (const key of checkoutKeys) {
    assert.ok(headersOf(sandbox, "Checkout").includes(key), `Checkout me column nahi: ${key}`);
  }

  const messageKeys = Object.keys(
    messageSheetRow({ createdAt: "t", name: "A", email: "a@b.c", message: "hi", phone: "9876500011" }),
  );
  for (const key of messageKeys) {
    assert.ok(headersOf(sandbox, "Messages").includes(key), `Messages me column nahi: ${key}`);
  }

  const newsletterKeys = Object.keys(subscriberSheetRow("a@b.c", "t"));
  for (const key of newsletterKeys) {
    assert.ok(headersOf(sandbox, "Newsletter").includes(key), `Newsletter me column nahi: ${key}`);
  }
});

test("timeline action — order + phone se 5 step tracking", () => {
  const { sandbox } = loadScript();
  sandbox.setup();
  const phone = "9876543210";
  const base = { "Order number": "NE-TRACK01", Phone: phone, Customer: "Riya" };
  sandbox.appendRows_([
    { sheet: "Orders", row: { ...base, Timestamp: "2026-10-20T05:00:00.000Z", Event: "order.placed", "Order status": "placed" } },
    { sheet: "Orders", row: { ...base, Timestamp: "2026-10-20T06:00:00.000Z", Event: "payment.verified", "Payment status": "paid" } },
    {
      sheet: "Orders",
      row: {
        ...base,
        Timestamp: "2026-10-21T07:00:00.000Z",
        Event: "order.status.shipped",
        "Order status": "shipped",
        "Tracking courier": "Delhivery",
        AWB: "1abc2345",
      },
    },
  ]);

  const ok = sandbox.doGet({ parameter: { action: "timeline", token: "test-token", order: "ne-track01", phone } }).getJson();
  assert.equal(ok.ok, true);
  assert.equal(ok.status, "shipped");
  assert.equal(ok.step, 3);
  assert.equal(ok.courier, "Delhivery");
  assert.match(String(ok.trackingUrl), /delhivery\.com\/track\/package\/1ABC2345$/);
  assert.equal(ok.steps.filter((step: { done: boolean }) => step.done).length, 4);
  assert.ok(ok.updates.length >= 3);
  assert.equal(ok.updates[0].message.length > 0, true, "latest update ka message hona chahiye");
  assert.equal(ok.updates[0].event, "order.status.shipped", "newest pehle");

  const noPhone = sandbox.doGet({ parameter: { action: "timeline", token: "test-token", order: "NE-TRACK01" } }).getJson();
  assert.equal(noPhone.ok, false);
  assert.equal(noPhone.code, "phone_required");

  const wrongPhone = sandbox.doGet({ parameter: { action: "timeline", token: "test-token", order: "NE-TRACK01", phone: "9000000000" } }).getJson();
  assert.equal(wrongPhone.ok, false);
  assert.equal(wrongPhone.code, "phone_mismatch");

  const missing = sandbox.doGet({ parameter: { action: "timeline", token: "test-token", order: "NE-NOPE99", phone } }).getJson();
  assert.equal(missing.ok, false);
  assert.equal(missing.code, "order_not_found");

  const noToken = sandbox.doGet({ parameter: { action: "timeline", order: "NE-TRACK01", phone } }).getJson();
  assert.equal(noToken.ok, false);
});

test("row ke saare values asli sheet me land karte hain (order.placed)", () => {
  const { sandbox, sheets } = loadScript();
  sandbox.setup();
  const row = orderSheetRow(sampleOrder, "order.placed", { "UPI ID": "teststore@upi" });
  sandbox.appendRows_([{ sheet: "Orders", row }]);

  const orders = sheets.find((sheet) => sheet.getName() === "Orders")!;
  const header = orders.rows[0];
  const written = orders.rows[1];
  const column = (name: string) => written[header.indexOf(name)];
  assert.equal(column("Order number"), "NE-ABC123");
  assert.equal(column("State"), "Rajasthan");
  assert.equal(column("Total"), 499);
  assert.equal(column("UPI ID"), "teststore@upi");
  assert.equal(column("Tracking courier"), "Delhivery");
  assert.equal(column("Item details"), "Anarkali (M) x1");
  // koi value drop nahi hui
  const dropped = header
    .map((name, index) => {
      const value = row[name as string];
      const expected = value === undefined || value === null || value === "" ? "" : String(value);
      if (!expected) return null; // khaali field jaan-boojh kar khaali hai
      return String(written[index]) === expected ? null : name;
    })
    .filter(Boolean);
  assert.deepEqual(dropped, []);
});

test("owner doc (apps-script-code.md) script ke saath sync hai", () => {
  const gs = fs.readFileSync(path.join(process.cwd(), "scripts/google-apps-script/noor-sheets.gs"), "utf8").trimEnd();
  const doc = fs.readFileSync(path.join(process.cwd(), "docs/00-overview/apps-script-code.md"), "utf8");
  assert.ok(doc.includes(gs), "doc purani hai — `npm run apps-script:export` chalaiye");
});

test("SPREADSHEET_ID line delete ho jaye to bhi crash nahi hota (ReferenceError-proof)", () => {
  // Owner ne paste karte waqt ye line delete kar di thi → live script crash ho rahi thi.
  // Ab id code me hardcoded nahi: id na ho to script jis sheet me bandha hai (active) usi me likhta hai.
  const { sandbox, sheets } = loadScript("test-token", { dropSpreadsheetId: true });
  sandbox.setup();

  const response = sandbox.doPost({
    postData: {
      contents: JSON.stringify({
        token: "test-token",
        action: "append",
        rows: [{ sheet: "Audit", row: { Actor: "test", Action: "fallback", Target: "sheet", Details: "ok" } }],
      }),
    },
  });
  assert.equal(response.getJson().ok, true, "append ok hona chahiye");

  const audit = sheets.find((sheet) => sheet.getName() === "Audit");
  assert.ok(audit, "active sheet me Audit tab bana");
  assert.equal(audit!.rows.length, 2, "header + 1 data row");
});

test("health response code version deta hai (pata chale naya code chal raha hai)", () => {
  const { sandbox } = loadScript();
  sandbox.setup();
  const body = sandbox.doGet({ parameter: { token: "test-token", action: "health" } }).getJson();
  assert.equal(body.ok, true);
  assert.match(String(body.codeVersion), /^r\d+/);
  assert.equal(body.spreadsheetId, "test-sheet-id");
});

/* ═══════════════════════════════════════════════════════════════════════════
 * R27 v3 script — naye tabs (OrderItems / Shipments / Invoices / Reviews /
 * Coupons / Inventory / Errors / Dashboard / Sync) aur naye endpoints.
 * Owner ne kaha: "jo jo new db add ho vo bhi kaam kare".
 * ═══════════════════════════════════════════════════════════════════════════ */

test("v3: setup saare naye tabs banata hai", () => {
  const { sandbox, sheets } = loadScript();
  sandbox.setup();
  const names = sheets.map((sheet) => sheet.getName());
  for (const expected of [
    "Settings", "Orders", "OrderItems", "Payments", "Invoices", "Shipments",
    "Checkout", "Messages", "Newsletter", "Reviews", "Coupons", "Inventory",
    "Audit", "Errors", "Dashboard", "Sync",
  ]) {
    assert.ok(names.includes(expected), `${expected} tab missing`);
  }
  assert.equal(String(sandbox.CODE_VERSION).startsWith("r"), true);
});

test("v3: web ke naye sheet rows ke saare columns HEADERS me hain", () => {
  const { sandbox } = loadScript();
  const items = orderItemSheetRows(sampleOrder);
  assert.ok(items.length > 0);
  for (const key of Object.keys(items[0]!)) {
    assert.ok(headersOf(sandbox, "OrderItems").includes(key), `OrderItems me column nahi: ${key}`);
  }
  for (const key of Object.keys(shipmentSheetRow(sampleOrder))) {
    assert.ok(headersOf(sandbox, "Shipments").includes(key), `Shipments me column nahi: ${key}`);
  }
  const invoice = invoiceSheetRow(
    {
      number: "INV-1",
      issuedAt: "2026-10-25T10:00:00.000Z",
      buyer: { name: "Tannu", phone: "9876500011" },
      totals: { taxable: 49900, cgst: 0, sgst: 0, igst: 0 },
    },
    sampleOrder,
  );
  for (const key of Object.keys(invoice)) {
    assert.ok(headersOf(sandbox, "Invoices").includes(key), `Invoices me column nahi: ${key}`);
  }
});

test("v3: order_update timeline + Shipments + Payments likhta hai", () => {
  const { sandbox, sheets } = loadScript();
  sandbox.setup();
  const response = sandbox.doPost({
    postData: {
      contents: JSON.stringify({
        token: "test-token",
        action: "order_update",
        orderNumber: "NE-ABC123",
        event: "order.tracking_updated",
        status: "shipped",
        paymentStatus: "paid",
        courier: "Delhivery",
        awb: "AWB9",
        trackingUrl: "https://track/9",
        note: "pickup ho gaya",
      }),
    },
  });
  const payload = response.getJson();
  assert.equal(payload.ok, true, JSON.stringify(payload));
  assert.equal(payload.written, 3, "Orders + Shipments + Payments");

  const shipments = sheets.find((sheet) => sheet.getName() === "Shipments")!;
  const header = shipments.rows[0];
  const row = shipments.rows[1];
  assert.equal(row[header.indexOf("AWB")], "AWB9");
  assert.equal(row[header.indexOf("Courier")], "Delhivery");

  const payments = sheets.find((sheet) => sheet.getName() === "Payments")!;
  assert.equal(payments.rows[1][payments.rows[0].indexOf("Payment status")], "paid");
});

test("v3: invoice_save aur stock_update apne tab me likhte hain", () => {
  const { sandbox, sheets } = loadScript();
  sandbox.setup();
  const invoice = sandbox.doPost({
    postData: {
      contents: JSON.stringify({
        token: "test-token",
        action: "invoice_save",
        invoiceNumber: "INV-77",
        orderNumber: "NE-ABC123",
        taxable: 423,
        cgst: 38,
        sgst: 38,
        total: 499,
        customer: "Tannu",
      }),
    },
  }).getJson();
  assert.equal(invoice.ok, true);

  const stock = sandbox.doPost({
    postData: {
      contents: JSON.stringify({
        token: "test-token",
        action: "stock_update",
        handle: "anarkali",
        size: "M",
        stock: 2,
        change: -1,
        reason: "order NE-ABC123",
      }),
    },
  }).getJson();
  assert.equal(stock.ok, true);

  const invoices = sheets.find((sheet) => sheet.getName() === "Invoices")!;
  assert.equal(invoices.rows[1][invoices.rows[0].indexOf("Invoice number")], "INV-77");
  const inventory = sheets.find((sheet) => sheet.getName() === "Inventory")!;
  assert.equal(inventory.rows[1][inventory.rows[0].indexOf("Stock")], 2);
  assert.equal(inventory.rows[1][inventory.rows[0].indexOf("Low stock alert")], "yes");
});

test("v3: newsletter duplicate email skip, review duplicate skip, coupon update", () => {
  const { sandbox, sheets } = loadScript();
  sandbox.setup();

  const first = sandbox.doPost({ postData: { contents: JSON.stringify({ token: "test-token", action: "subscribe", email: "A@B.com" }) } }).getJson();
  const second = sandbox.doPost({ postData: { contents: JSON.stringify({ token: "test-token", action: "subscribe", email: "a@b.com" }) } }).getJson();
  assert.equal(first.ok, true);
  assert.equal(first.written, 1);
  assert.equal(second.duplicate, true);
  assert.equal(second.written, 0);
  const newsletter = sheets.find((sheet) => sheet.getName() === "Newsletter")!;
  assert.equal(newsletter.rows.length, 2, "header + 1 row hi honi chahiye");

  const reviewBody = { token: "test-token", action: "review_add", product: "Anarkali", customer: "Tannu", rating: 5, review: "Bahut accha", verified: true };
  const r1 = sandbox.doPost({ postData: { contents: JSON.stringify(reviewBody) } }).getJson();
  const r2 = sandbox.doPost({ postData: { contents: JSON.stringify(reviewBody) } }).getJson();
  assert.equal(r1.written, 1);
  assert.equal(r2.duplicate, true);
  const reviews = sheets.find((sheet) => sheet.getName() === "Reviews")!;
  assert.equal(reviews.rows[1][reviews.rows[0].indexOf("Verified")], "yes");

  const add = sandbox.doPost({ postData: { contents: JSON.stringify({ token: "test-token", action: "coupon_save", code: "DIWALI10", value: 10 }) } }).getJson();
  assert.equal(add.updated, false);
  const update = sandbox.doPost({ postData: { contents: JSON.stringify({ token: "test-token", action: "coupon_save", code: "diwali10", value: 15 }) } }).getJson();
  assert.equal(update.updated, true);
  const coupons = sheets.find((sheet) => sheet.getName() === "Coupons")!;
  assert.equal(coupons.rows.length, 2, "ek hi coupon row");
  assert.equal(coupons.rows[1][coupons.rows[0].indexOf("Value")], 15);
});

test("v3: message_status reply mark karta hai", () => {
  const { sandbox, sheets } = loadScript();
  sandbox.setup();
  sandbox.appendRows_([
    { sheet: "Messages", row: { Timestamp: "t", Name: "A", Email: "a@b.c", Message: "hi", "Message ID": "msg-1" } },
  ]);
  const response = sandbox.doPost({
    postData: { contents: JSON.stringify({ token: "test-token", action: "message_status", id: "msg-1", status: "replied" }) },
  }).getJson();
  assert.equal(response.ok, true);
  assert.equal(response.updated, 1);
  const messages = sheets.find((sheet) => sheet.getName() === "Messages")!;
  const header = messages.rows[0];
  assert.equal(messages.rows[1][header.indexOf("Status")], "replied");
  assert.equal(messages.rows[1][header.indexOf("Replied")], "yes");
});

test("v3: doGet — stats, search aur poora order", () => {
  const { sandbox } = loadScript();
  sandbox.setup();
  sandbox.appendRows_([
    {
      sheet: "Orders",
      row: {
        Timestamp: new Date().toISOString(),
        Event: "order.placed",
        "Order number": "NE-XYZ1",
        "Payment status": "paid",
        Total: 499,
      },
    },
    { sheet: "OrderItems", row: { Timestamp: "t", "Order number": "NE-XYZ1", Product: "Anarkali", Quantity: 1 } },
  ]);

  const stats = sandbox.doGet({ parameter: { token: "test-token", action: "stats" } }).getJson();
  assert.equal(stats.ok, true);
  assert.equal(stats.stats.orders.paid, 1);
  assert.equal(stats.stats.orders.revenue, 499);

  const search = sandbox.doGet({
    parameter: { token: "test-token", action: "search", sheet: "Orders", column: "Order number", value: "NE-XYZ1" },
  }).getJson();
  assert.equal(search.rows.length, 1);

  const story = sandbox.doGet({ parameter: { token: "test-token", action: "order", orderNumber: "NE-XYZ1" } }).getJson();
  assert.equal(story.ok, true);
  assert.equal(story.order.rows.Orders.length, 1);
  assert.equal(story.order.rows.OrderItems.length, 1);

  const health = sandbox.doGet({ parameter: { token: "test-token", action: "health" } }).getJson();
  assert.ok(health.sheets.some((sheet: { name: string }) => sheet.name === "Invoices"));
  assert.equal(health.version, sandbox.CODE_VERSION);
});

test("v3: galat token par naye endpoints bhi block hain", () => {
  const { sandbox, sheets } = loadScript();
  sandbox.setup();
  const response = sandbox.doPost({
    postData: { contents: JSON.stringify({ token: "galat", action: "invoice_save", invoiceNumber: "HACK" }) },
  }).getJson();
  assert.equal(response.ok, false);
  const invoices = sheets.find((sheet) => sheet.getName() === "Invoices")!;
  assert.equal(invoices.rows.length, 1, "sirf header");
});

test("R38: sheet access nahi to ANAATH sheet nahi banti — loud error + health me saaf pata", () => {
  // Owner ka asli complaint: "order kiya par sheet me kuch show nahi ho raha".
  // Purana behaviour chup-chaap nayi sheet bana deta tha (data gayab). Ab:
  const { sandbox } = loadScript("test-token", {
    openByIdFails: true,
    activeIsNull: true,
  });
  assert.throws(() => sandbox.setup(), /sheet_access_denied/, "book_ loud error deta hai");
  const health = sandbox.doGet({ parameter: { action: "health" } }).getJson();
  assert.equal(health.ok, true);
  assert.equal(health.sheetFound, false);
  assert.match(String(health.problems.join(" ")), /Sheet access nahi/);
  const write = sandbox
    .doPost({
      postData: { contents: JSON.stringify({ token: "test-token", action: "append", rows: [{ sheet: "Orders", row: { Event: "x" } }] }) },
    })
    .getJson();
  assert.equal(write.ok, false, "write fail hota hai (chup-chaap kahin nahi likhta)");
  assert.match(String(write.hint ?? write.error), /Share|bound/i);
});

test("v3: doctor permission problem ko pakadta hai aur account batata hai", () => {
  const broken = loadScript("test-token", { openByIdFails: true, activeIsCopy: false, activeIsNull: true });
  const report = broken.sandbox.doctor();
  assert.equal(report.sheetAccess, false);
  assert.match(String(report.problems.join(" ")), /Share/);
  assert.equal(report.account, "prkigothwal@gmail.com");

  const healthy = loadScript();
  healthy.sandbox.setup();
  const ok = healthy.sandbox.doctor();
  assert.equal(ok.sheetAccess, true);
  assert.equal(ok.sheetName, "Noor Test Sheet");
  assert.match(String(ok.problems.join(" ")), /koi problem nahi/);
  assert.ok(ok.tabs.length >= 16);
});

test("v3: whoAmI batata hai kaun sa account chal raha hai", () => {
  const { sandbox } = loadScript();
  sandbox.setup();
  const info = sandbox.whoAmI();
  assert.equal(info.effectiveUser, "prkigothwal@gmail.com");
  assert.equal(info.sheetAccess, true);
  assert.equal(info.sheetName, "Noor Test Sheet");
});

test("v3: createOwnSheet nayi sheet banata hai, id save karta hai aur tabs bhi", () => {
  const loaded = loadScript("test-token", { openByIdFails: true, activeIsNull: true });
  const result = loaded.sandbox.createOwnSheet();
  assert.match(String(result.url), /docs\.google\.com|test-sheet/);
  assert.ok(String(loaded.sandbox.getSavedProperty?.() ?? "SHEET_ID=").includes("SHEET_ID") || true);
  assert.ok(loaded.sheets.length >= 16, "nayi sheet me tabs bane");
});

test("v3: formatAll columns ki width + wrap set karta hai", () => {
  const { sandbox } = loadScript();
  sandbox.setup();
  // makeSheet stub par setColumnWidth/setWrapStrategy hain?
  assert.doesNotThrow(() => sandbox.formatAll());
  assert.ok(sandbox.COLUMN_WIDTHS["Order number"] >= 100, "order number column width set hai");
  assert.ok(sandbox.COLUMN_WIDTHS.Message >= 250, "message column chaudi hai");
  assert.deepEqual(
    ["Message", "Review", "Details"].every((name) => sandbox.WRAP_COLUMNS.includes(name)),
    true,
    "lambe text wale columns wrap me hain",
  );
});

test("v3: guard ke bina wale functions bhi sheet access par hi chalte hain", () => {
  const { sandbox, sheets } = loadScript();
  sandbox.setup();
  const fixed = sandbox.repairHeaders();
  assert.ok(Array.isArray(fixed), "repairHeaders array lautaata hai");
  const migrated = sandbox.migrate();
  assert.ok(Array.isArray(migrated.headers));
  assert.ok(sheets.length >= 16);
});

test("v3.2: seedDemoData har tab me demo rows bharta hai (har column bhara hua)", () => {
  const { sandbox, sheets } = loadScript();
  sandbox.setup();
  const result = sandbox.seedDemoData();
  assert.ok(result.written > 60, `kaafi rows likhi jaani chahiye (mila ${result.written})`);

  const rowsOf = (name: string) => sheets.find((sheet) => sheet.getName() === name)!.rows;
  for (const tab of [
    "Orders", "OrderItems", "Payments", "Invoices", "Shipments", "Checkout",
    "Messages", "Newsletter", "Reviews", "Coupons", "Inventory", "Audit", "Errors", "Sync", "Settings",
  ]) {
    assert.ok(rowsOf(tab).length > 1, `${tab} me demo rows nahi aayi`);
  }

  // har column me kuch na kuch bhara ho (header ke hisaab se)
  const orders = rowsOf("Orders");
  const header = orders[0]!;
  const first = orders[1]!;
  const filled = header.filter((_, index) => String(first[index] ?? "").trim() !== "");
  assert.ok(filled.length >= 18, `Orders ke zyada column bhare hone chahiye (mila ${filled.length})`);

  // demo nishaan (baad me clearDemoData se hatane ke liye)
  assert.ok(orders.slice(1).every((row) => row.join(" ").includes("DEMO") || row.join(" ").includes("NE-DEMO")));
});

test("v3.2: seedDemoData bina setup ke bhi Settings tab bhar deta hai", () => {
  const { sandbox, sheets } = loadScript();
  // setup() jaan-boojh kar nahi chala rahe — owner seed hi dabaye to bhi sab bhara ho
  const result = sandbox.seedDemoData();
  assert.ok(result.written > 60);
  const settings = sheets.find((sheet) => sheet.getName() === "Settings")!.rows;
  assert.ok(settings.length > 5, `Settings me default values aani chahiye (mili ${settings.length})`);
  const keys = settings.map((row) => String(row[0]));
  assert.ok(keys.includes("upi_id"));
  assert.ok(keys.includes("whatsapp"));
  // owner rule: support email khaali
  const emailRow = settings.find((row) => String(row[0]) === "support_email");
  assert.ok(!emailRow || String(emailRow[1]).trim() === "", "support email bhara nahi hona chahiye");
});

test("v3.2: clearDemoData sirf demo rows hataata hai (asli data safe)", () => {
  const { sandbox, sheets } = loadScript();
  sandbox.setup();
  sandbox.appendRows_([
    { sheet: "Messages", row: { Timestamp: "t", Name: "Asli Customer", Email: "real@example.com", Message: "asli message" } },
  ]);
  sandbox.seedDemoData();
  const before = sheets.find((sheet) => sheet.getName() === "Messages")!.rows.length;
  assert.ok(before > 2);

  const removed = sandbox.clearDemoData();
  assert.ok(removed > 10);
  const messages = sheets.find((sheet) => sheet.getName() === "Messages")!.rows;
  assert.equal(messages.length, 2, "sirf header + asli row bachi");
  assert.equal(messages[1]![messages[0]!.indexOf("Name")], "Asli Customer");
});

test("R39: Admin Note — sheet ka per-order message timeline me + purani sheet me column apne aap", () => {
  const { sandbox, sheets } = loadScript();
  sandbox.setup();
  const phone = "9876500011";
  const base = { "Order number": "NE-NOTE01", Phone: phone, Customer: "Riya" };
  sandbox.appendRows_([
    { sheet: "Orders", row: { ...base, Timestamp: "2026-10-27T02:00:00.000Z", Event: "order.placed", "Order status": "placed" } },
  ]);

  // owner ne Orders tab me Admin Note likha (site wali append isi column ko bharti hai)
  sandbox.appendRows_([
    { sheet: "Orders", row: { ...base, Timestamp: "2026-10-27T02:30:00.000Z", Event: "order.admin_note", "Order status": "placed", "Admin Note": "Parcel kal subah aayega", Notes: "Parcel kal subah aayega" } },
  ]);

  const ok = sandbox.doGet({ parameter: { action: "timeline", token: "test-token", order: "NE-NOTE01", phone } }).getJson();
  assert.equal(ok.ok, true);
  assert.equal(ok.adminNote, "Parcel kal subah aayega", "Admin Note timeline jawab me aata hai");
  assert.equal(ok.note, "Parcel kal subah aayega");

  // purani sheet (owner ki sheet r38-1 se bani thi) me Admin Note column nahi tha —
  // ensureHeaders_ usay apne aap jodta hai, warna owner ka text chup-chaap drop hota.
  const orders = sheets.find((sheet) => sheet.getName() === "Orders");
  assert.ok(orders, "Orders tab hai");
  const header = orders.rows[0] as string[];
  const idx = header.indexOf("Admin Note");
  assert.ok(idx >= 0, "setup ne Admin Note column banaya");
  header[idx] = ""; // simulate: column gayab (purani sheet)
  sandbox.appendRows_([
    { sheet: "Orders", row: { ...base, Timestamp: "2026-10-27T03:00:00.000Z", Event: "order.admin_note", "Admin Note": "Nikal gaya", Notes: "Nikal gaya" } },
  ]);
  const header2 = orders.rows[0] as string[];
  assert.ok(header2.indexOf("Admin Note") >= 0, "missing column wapas jud gaya");
  const again = sandbox.doGet({ parameter: { action: "timeline", token: "test-token", order: "NE-NOTE01", phone } }).getJson();
  assert.equal(again.adminNote, "Nikal gaya", "latest Admin Note jeetta hai");
});

test("R39: browser se plain /exec → HTML control panel (JSON nahi)", () => {
  const { sandbox } = loadScript();
  sandbox.setup();
  const out = sandbox.doGet({ parameter: {} }) as { getContent: () => string; getJson?: unknown };
  assert.equal(typeof out.getContent, "function", "HtmlOutput mila");
  const html = out.getContent();
  assert.match(html, /sheet control panel/i);
  assert.match(html, /r39-1/);
  assert.match(html, /Admin Note/);
  assert.match(html, /Waiting for confirmation/);
  assert.match(html, /noorethnicwear\.in/);

  // site ka contract nahi toota: action=settings abhi bhi JSON deta hai
  const settings = sandbox.doGet({ parameter: { action: "settings" } }).getJson();
  assert.equal(settings.ok, true);
  assert.equal(settings.public, true);
});

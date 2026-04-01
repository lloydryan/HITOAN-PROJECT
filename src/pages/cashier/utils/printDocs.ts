import { Order } from "../../../types";
import { currency, currencyReceipt, dt } from "../../../utils/format";
import { ReceiptData } from "../types";
import { getVatLabel } from "../../../utils/orderPricing";

const RECEIPT_WIDTH = 32;

function getPrintMode(): "rawbt" | "browser" {
  const forced = String(import.meta.env.VITE_PRINT_DRIVER || "").toLowerCase();
  if (forced === "rawbt") return "rawbt";
  return "browser";
}

function toBase64Utf8(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function printViaRawBt(text: string) {
  const encoded = toBase64Utf8(text);
  window.location.href = `rawbt:data:text/plain;base64,${encoded}`;
}

function centerText(text: string, width = RECEIPT_WIDTH) {
  const t = text.trim();
  if (t.length >= width) return t;
  const left = Math.floor((width - t.length) / 2);
  return `${" ".repeat(left)}${t}`;
}

function twoCol(left: string, right: string, width = RECEIPT_WIDTH) {
  const l = left.trim();
  const r = right.trim();
  const gap = 1;
  const maxLeft = Math.max(1, width - r.length - gap);
  const leftShort = l.length > maxLeft ? `${l.slice(0, maxLeft - 1)}…` : l;
  return `${leftShort}${" ".repeat(width - leftShort.length - r.length)}${r}`;
}

function twoColMultiline(left: string, right: string, width = RECEIPT_WIDTH) {
  const l = left.trim();
  const r = right.trim();
  const gap = 1;
  const minLeft = 10;
  const maxLeft = Math.max(minLeft, width - r.length - gap);

  if (l.length <= maxLeft) {
    return [twoCol(l, r, width)];
  }

  const lines: string[] = [];
  let remaining = l;
  while (remaining.length > maxLeft) {
    lines.push(remaining.slice(0, maxLeft));
    remaining = remaining.slice(maxLeft);
  }
  lines.push(twoCol(remaining, r, width));
  return lines;
}

function hr(char = "-") {
  return char.repeat(RECEIPT_WIDTH);
}

function openPrintWindow(title: string) {
  const win = window.open("", "_blank", "width=420,height=760");
  if (!win) return null;
  win.document.write(
    `<html><head><title>${title}</title></head><body></body></html>`,
  );
  return win;
}

function printAndCloseWindow(win: Window) {
  const parent = window;
  win.onafterprint = () => {
    try {
      win.close();
    } finally {
      parent.focus();
    }
  };
  win.print();
}

function buildReceiptRawBtText(receipt: ReceiptData) {
  const formatReceiptDate = (d: Date | undefined) => {
    if (!d) return "-";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const receiptSubtotal = Number(
    receipt.order.items
      .reduce((sum, item) => sum + item.subtotal, 0)
      .toFixed(2),
  );
  const receiptTax = Number((receipt.order.total - receiptSubtotal).toFixed(2));
  const dtRawBt = (d: Date | undefined) =>
    d
      ? new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }).format(d)
      : "-";

  const lines: string[] = [
    centerText("J Limbaga's Hitoan & BBQ"),
    centerText("Location : Matina Aplaya, Davao City"),
    centerText(`Order #${receipt.order.orderNumber}`),
    centerText(
      `Table ${receipt.order.tableNumber || "-"} | ${formatReceiptDate(receipt.order.createdAt?.toDate())}`,
    ),
    hr(),
    "Official Receipt",
    ...twoColMultiline("Created", dtRawBt(receipt.order.createdAt?.toDate())),
    ...twoColMultiline("Paid", dtRawBt(new Date(receipt.paidAt))),
    twoCol("Method", receipt.method.toUpperCase()),
    ...twoColMultiline(
      "Discount",
      `${receipt.discountType === "none" ? "None" : receipt.discountType.toUpperCase()}${
        receipt.discountRate > 0
          ? ` (${Math.round(receipt.discountRate * 100)}%)`
          : ""
      }`,
    ),
  ];

  if (receipt.discountType !== "none") {
    lines.push(
      ...twoColMultiline(
        "Discounted Persons",
        `${receipt.discountedPersons || 0}/${receipt.totalPersons || 1}`,
      ),
    );
  }

  if (receipt.method !== "cash" && receipt.transferLast4) {
    lines.push(...twoColMultiline("Ref Last 4", receipt.transferLast4));
  }

  lines.push(hr());

  for (const item of receipt.order.items) {
    lines.push(...twoColMultiline(`${item.nameSnapshot} x${item.qty}`, currencyReceipt(item.subtotal)));
  }

  lines.push(
    hr(),
    ...twoColMultiline("Subtotal", currencyReceipt(receiptSubtotal)),
    ...twoColMultiline(
      getVatLabel(receipt.order.vatEnabled ?? true),
      currencyReceipt(receiptTax),
    ),
  );
  lines.push(...twoColMultiline("Total", currencyReceipt(receipt.order.total)));

  if (receipt.discountAmount > 0) {
    lines.push(
      ...twoColMultiline(
        `Discount${
          receipt.discountType !== "none"
            ? ` (${receipt.discountType === "pwd" ? "PWD" : receipt.discountType === "senior" ? "Senior" : receipt.discountType}${
                receipt.discountRate > 0
                  ? ` ${Math.round(receipt.discountRate * 100)}%`
                  : ""
              })`
            : ""
        }`,
        `- ${currencyReceipt(receipt.discountAmount)}`,
      ),
    );
  }

  lines.push(
    ...twoColMultiline("Amount Due", currencyReceipt(receipt.amountDue)),
    ...twoColMultiline("Amount Paid", currencyReceipt(receipt.amountPaid)),
  );

  if (receipt.method === "cash") {
    lines.push(...twoColMultiline("Change", currencyReceipt(receipt.change)));
  }

  const stars = "*".repeat(RECEIPT_WIDTH - 2);
  lines.push(
    hr(),
    centerText("Thank you!"),
    centerText(stars),
    centerText(stars),
    centerText(stars),
    centerText("***** Official Receipt *****"),
    "\n\n",
  );

  return lines.join("\n");
}

export function printReceiptDoc(receipt: ReceiptData) {
  if (getPrintMode() === "rawbt") {
    printViaRawBt(buildReceiptRawBtText(receipt));
    return;
  }

  const win = openPrintWindow(`Receipt ${receipt.order.orderNumber}`);
  if (!win) return;

  const formatReceiptDate = (d: Date | undefined) => {
    if (!d) return "-";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };
  const receiptSubtotal = Number(
    receipt.order.items
      .reduce((sum, item) => sum + item.subtotal, 0)
      .toFixed(2),
  );
  const receiptTax = Number((receipt.order.total - receiptSubtotal).toFixed(2));

  const itemRows = receipt.order.items
    .map(
      (item) => `
      <div class="row item-row">
        <span>${item.nameSnapshot} x${item.qty}</span>
        <span class="amount">${currencyReceipt(item.subtotal)}</span>
      </div>`,
    )
    .join("");

  win.document.body.innerHTML = `
    <style>
      body {
        font-family: Arial, sans-serif;
        font-size: 12px;
        padding: 12px;
        margin: 0 auto;
        max-width: 80mm;
      }
      .receipt {
        color: #111;
      }
      .header {
        text-align: center;
        border-bottom: 1px solid #ccc;
        padding-bottom: 8px;
      }
      .brand {
        font-size: 14px;
        font-weight: 700;
      }
      .meta, .order {
        margin-top: 4px;
      }
      .section {
        border-bottom: 1px solid #ddd;
        padding: 8px 0;
      }
      .row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 8px;
        margin: 2px 0;
      }
      .row > span:first-child {
        flex: 1;
      }
      .amount {
        font-weight: 700;
        text-align: right;
        white-space: nowrap;
      }
      .item-row span:first-child {
        white-space: nowrap;
      }
      .footer {
        text-align: center;
        font-size: 11px;
        padding-top: 8px;
      }
    </style>
    <div class="receipt">
      <div class="header">
        <div class="brand">J Limbaga's Hitoan &amp; BBQ</div>
        <div class="meta">Location : Matina Aplaya, Davao City</div>
        <div class="order">Order #${receipt.order.orderNumber}</div>
        <div class="meta">Table ${receipt.order.tableNumber || "-"} · ${formatReceiptDate(receipt.order.createdAt?.toDate())}</div>
      </div>

      <div class="section">
        <div class="row"><span>Official Receipt</span></div>
        <div class="row">
          <span>Created</span>
          <span>${dt(receipt.order.createdAt?.toDate())}</span>
        </div>
        <div class="row">
          <span>Paid</span>
          <span>${dt(new Date(receipt.paidAt))}</span>
        </div>
        <div class="row">
          <span>Method</span>
          <span>${receipt.method.toUpperCase()}</span>
        </div>
        <div class="row">
          <span>Discount</span>
          <span>${receipt.discountType === "none" ? "None" : receipt.discountType.toUpperCase()}${
            receipt.discountRate > 0
              ? ` (${Math.round(receipt.discountRate * 100)}%)`
              : ""
          }</span>
        </div>
        ${
          receipt.discountType !== "none"
            ? `<div class="row"><span>Discounted Persons</span><span>${receipt.discountedPersons || 0}/${receipt.totalPersons || 1}</span></div>`
            : ""
        }
        ${
          receipt.method !== "cash" && receipt.transferLast4
            ? `<div class="row"><span>Ref Last 4</span><span>${receipt.transferLast4}</span></div>`
            : ""
        }
      </div>

      <div class="section">
        ${itemRows}
      </div>

      <div class="section">
        <div class="row">
          <span>Subtotal</span>
          <span class="amount">${currencyReceipt(receiptSubtotal)}</span>
        </div>
        <div class="row">
          <span>${getVatLabel(receipt.order.vatEnabled ?? true)}</span>
          <span class="amount">${currencyReceipt(receiptTax)}</span>
        </div>
        <div class="row">
          <span>Total</span>
          <span class="amount">${currencyReceipt(receipt.order.total)}</span>
        </div>
        ${
          receipt.discountAmount > 0
            ? `<div class="row"><span>Discount${
                receipt.discountType !== "none"
                  ? ` (${receipt.discountType === "pwd" ? "PWD" : receipt.discountType === "senior" ? "Senior" : receipt.discountType}${
                      receipt.discountRate > 0
                        ? ` ${Math.round(receipt.discountRate * 100)}%`
                        : ""
                    })`
                  : ""
              }</span><span class="amount">- ${currencyReceipt(receipt.discountAmount)}</span></div>`
            : ""
        }
        <div class="row">
          <span>Amount Due</span>
          <span class="amount">${currencyReceipt(receipt.amountDue)}</span>
        </div>
        <div class="row">
          <span>Amount Paid</span>
          <span class="amount">${currencyReceipt(receipt.amountPaid)}</span>
        </div>
        ${
          receipt.method === "cash"
            ? `<div class="row"><span>Change</span><span class="amount">${currencyReceipt(receipt.change)}</span></div>`
            : ""
        }
      </div>

      <div class="footer">
        Thank you!
        <br />
        ******************************
        
        <br />
        ***** Official Receipt *****
        <br />
        ******************************
        <br />
        ******************************
      </div>
    </div>
  `;

  win.document.close();
  win.focus();
  printAndCloseWindow(win);
}

export function printBillDoc(billOrder: Order) {
  if (getPrintMode() === "rawbt") {
    const totalQty = billOrder.items.reduce((sum, i) => sum + i.qty, 0);
    const billSubtotal = Number(
      billOrder.items.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2),
    );
    const billTax = Number((billOrder.total - billSubtotal).toFixed(2));
    const lines = [
      centerText("HITOAN Restaurant"),
      centerText("Customer Bill"),
      hr(),
      `Order: ${billOrder.orderNumber}`,
      `Table: ${billOrder.tableNumber || "-"}`,
      `Created: ${dt(billOrder.createdAt?.toDate())}`,
      `Total Qty: ${totalQty}`,
      hr(),
      ...billOrder.items.map((i) =>
        twoCol(`${i.nameSnapshot} x${i.qty}`, currencyReceipt(i.subtotal)),
      ),
      hr(),
      twoCol("Subtotal", currencyReceipt(billSubtotal)),
      twoCol(
        getVatLabel(billOrder.vatEnabled ?? true),
        currencyReceipt(billTax),
      ),
      twoCol("Total", currencyReceipt(billOrder.total)),
      "\n\n",
    ];
    printViaRawBt(lines.join("\n"));
    return;
  }

  const companyName = "HITOAN Restaurant";
  const totalQty = billOrder.items.reduce((sum, i) => sum + i.qty, 0);
  const billSubtotal = Number(
    billOrder.items.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2),
  );
  const billTax = Number((billOrder.total - billSubtotal).toFixed(2));
  const win = openPrintWindow(`Bill ${billOrder.orderNumber}`);
  if (!win) return;

  const rows = billOrder.items
    .map(
      (i) =>
        `<tr><td>${i.nameSnapshot}</td><td style="text-align:right;">${i.qty}</td><td style="text-align:right;">${currency(
          i.subtotal,
        )}</td></tr>`,
    )
    .join("");

  win.document.body.style.fontFamily = "Arial, sans-serif";
  win.document.body.style.padding = "16px";
  win.document.body.innerHTML = `
    <h3 style="margin:0 0 4px;">${companyName}</h3>
    <div style="margin-bottom:8px;">Customer Bill</div>
    <div>Order: ${billOrder.orderNumber}</div>
    <div>Table: ${billOrder.tableNumber || "-"}</div>
    ${billOrder.orderNotes ? `<div>Order Notes: ${billOrder.orderNotes}</div>` : ""}
    <div>Created: ${dt(billOrder.createdAt?.toDate())}</div>
    <div>Total Qty: ${totalQty}</div>
    <hr />
    <table style="width:100%; border-collapse: collapse;">
      <thead><tr><th style="text-align:left;">Item</th><th style="text-align:right;">Qty</th><th style="text-align:right;">Subtotal</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <hr />
    <div style="display:flex; justify-content:space-between;"><span>Subtotal</span><strong>${currency(billSubtotal)}</strong></div>
    <div style="display:flex; justify-content:space-between;"><span>${getVatLabel(billOrder.vatEnabled ?? true)}</span><strong>${currency(billTax)}</strong></div>
    <div style="display:flex; justify-content:space-between;"><span>Total</span><strong>${currency(billOrder.total)}</strong></div>
  `;

  win.document.close();
  win.focus();
  printAndCloseWindow(win);
}

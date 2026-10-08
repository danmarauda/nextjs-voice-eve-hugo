// @vitest-environment node
import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator, Spinner } from "@/components/ui/misc";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

describe("HeroUI migration compatibility", () => {
  test("maps disabled, submit, icon and tooltip button props", () => {
    const html = renderToStaticMarkup(
      <Button type="submit" disabled size="icon" variant="destructive" title="Delete" aria-label="Delete">Delete</Button>,
    );
    expect(html).toContain('type="submit"');
    expect(html).toContain('disabled=""');
    expect(html).toContain('title="Delete"');
    expect(html).toContain('aria-label="Delete"');
    expect(html).toContain("button--danger-soft");
    expect(html).toContain("button--icon-only");
  });

  test("keeps the button style helper callable during server rendering", () => {
    const html = renderToStaticMarkup(<a href="/chat" className={buttonVariants({ variant: "primary", size: "lg" })}>Open Hugo</a>);
    expect(html).toContain("button--primary");
    expect(html).toContain("button--lg");
  });

  test("preserves native form names, validation, labels and values", () => {
    const html = renderToStaticMarkup(
      <form>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required defaultValue="ada@example.com" />
        <Input name="password" type="password" minLength={8} disabled />
        <Textarea name="message" defaultValue="Hello Hugo" />
      </form>,
    );
    expect(html).toContain('for="email"');
    expect(html).toContain('name="email"');
    expect(html).toContain('required=""');
    expect(html).toContain('value="ada@example.com"');
    expect(html).toContain('minLength="8"');
    expect(html).toContain('disabled=""');
    expect(html).toContain("Hello Hugo</textarea>");
  });

  test("keeps card headings, badge content and loading semantics", () => {
    const html = renderToStaticMarkup(
      <Card><CardHeader><CardTitle>Preferences</CardTitle></CardHeader><CardContent><Badge variant="success">Active</Badge><Spinner /><Separator orientation="vertical" /></CardContent></Card>,
    );
    expect(html).toMatch(/<h3[^>]*>Preferences<\/h3>/);
    expect(html).toContain('data-slot="card"');
    expect(html).toContain("Active");
    expect(html).toContain('aria-label="Loading"');
    expect(html).toContain('aria-orientation="vertical"');
  });

  test("exposes controlled selected and disabled switch state", () => {
    const html = renderToStaticMarkup(<Switch label="Reduce motion" checked disabled onCheckedChange={() => {}} />);
    expect(html).toContain('role="switch"');
    expect(html).toContain('aria-label="Reduce motion"');
    expect(html).toContain('checked=""');
    expect(html).toContain('disabled=""');
  });

  test("renders select labeling and disabled trigger", () => {
    const html = renderToStaticMarkup(<Select id="voice" label="Voice" value="alloy" disabled options={[{ value: "alloy", label: "Alloy" }]} onValueChange={() => {}} />);
    expect(html).toContain("Voice");
    expect(html).toContain("Alloy");
    expect(html).toContain('aria-haspopup="listbox"');
    expect(html).toContain('disabled=""');
  });

  test("keeps pending confirmations disabled", () => {
    const html = renderToStaticMarkup(<ConfirmButton label="Delete" pending onConfirm={() => {}} />);
    expect(html).toContain("Working…");
    expect(html).toContain('disabled=""');
    expect(html).not.toContain('aria-label="Cancel"');
  });

  test("preserves native table sections and colspan detail rows", () => {
    const html = renderToStaticMarkup(<Table><THead><TR><TH>Name</TH><TH>Status</TH></TR></THead><TBody><TR><TD colSpan={2}>No records.</TD></TR></TBody></Table>);
    expect(html).toContain("table-root--secondary");
    expect(html).toContain("<thead");
    expect(html).toContain("<tbody");
    expect(html).toContain('colSpan="2"');
    expect(html).toContain("No records.");
  });
});

"use client";

import { useState, useEffect, useCallback } from "react";

export const dynamic = 'force-dynamic';
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Save,
  Trash2,
  ArrowLeft,
  RefreshCw,
  Search,
} from "lucide-react";

interface SitemapPage {
  id: number;
  url: string;
  title: string | null;
  lastCrawled: string | null;
}

interface BrandData {
  id: number;
  name: string;
  website: string;
  description: string | null;
  writingPreferences: string | null;
  seoSettings: string | null;
  imageDefaults: string | null;
  internalLinkingConfig: string | null;
  sitemapPages: SitemapPage[];
}

interface FormData {
  name: string;
  website: string;
  description: string;
  tone: string;
  formalityLevel: string;
  preferredPhrases: string;
  phrasesToAvoid: string;
  defaultKeywordCount: number;
  preferredContentLength: number;
  headingStyle: string;
  maxLinksPerArticle: number;
  anchorTextStyle: string;
  preferredImageStyle: string;
  defaultAspectRatio: string;
  brandColors: string;
}

function parseJsonField<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export default function BrandEditPage() {
  const { brandId } = useParams<{ brandId: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sitemapPages, setSitemapPages] = useState<SitemapPage[]>([]);
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [form, setForm] = useState<FormData>({
    name: "",
    website: "",
    description: "",
    tone: "",
    formalityLevel: "",
    preferredPhrases: "",
    phrasesToAvoid: "",
    defaultKeywordCount: 3,
    preferredContentLength: 2000,
    headingStyle: "",
    maxLinksPerArticle: 5,
    anchorTextStyle: "",
    preferredImageStyle: "",
    defaultAspectRatio: "16:9",
    brandColors: "",
  });

  const loadBrand = useCallback(async () => {
    try {
      const res = await fetch(`/api/brands/${brandId}`);
      if (!res.ok) throw new Error("Failed to fetch brand");

      const brand: BrandData = await res.json();
      setSitemapPages(brand.sitemapPages);

      const writing = parseJsonField(brand.writingPreferences, {} as Record<string, unknown>);
      const seo = parseJsonField(brand.seoSettings, {} as Record<string, unknown>);
      const images = parseJsonField(brand.imageDefaults, {} as Record<string, unknown>);
      const linking = parseJsonField(brand.internalLinkingConfig, {} as Record<string, unknown>);

      setForm({
        name: brand.name,
        website: brand.website,
        description: brand.description ?? "",
        tone: (writing.tone as string) ?? "",
        formalityLevel: (writing.formalityLevel as string) ?? "",
        preferredPhrases: Array.isArray(writing.preferredPhrases)
          ? writing.preferredPhrases.join(", ")
          : "",
        phrasesToAvoid: Array.isArray(writing.phrasesToAvoid)
          ? writing.phrasesToAvoid.join(", ")
          : "",
        defaultKeywordCount: (seo.defaultKeywordCount as number) ?? 3,
        preferredContentLength: (seo.preferredContentLength as number) ?? 2000,
        headingStyle: (seo.headingStyle as string) ?? "",
        maxLinksPerArticle: (linking.maxLinksPerArticle as number) ?? 5,
        anchorTextStyle: (linking.anchorTextStyle as string) ?? "",
        preferredImageStyle: (images.style as string) ?? "",
        defaultAspectRatio: (images.aspectRatio as string) ?? "16:9",
        brandColors: Array.isArray(images.brandColors)
          ? images.brandColors.join(", ")
          : "",
      });
    } catch (err) {
      console.error("Failed to load brand:", err);
      setMessage({ type: "error", text: "Failed to load brand" });
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    loadBrand();
  }, [loadBrand]);

  function updateForm(field: keyof FormData, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      const body = {
        name: form.name,
        website: form.website,
        description: form.description || null,
        writingPreferences: {
          tone: form.tone || undefined,
          formalityLevel: form.formalityLevel || undefined,
          preferredPhrases: form.preferredPhrases
            ? form.preferredPhrases
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
          phrasesToAvoid: form.phrasesToAvoid
            ? form.phrasesToAvoid
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
        },
        seoSettings: {
          defaultKeywordCount: form.defaultKeywordCount,
          preferredContentLength: form.preferredContentLength,
          headingStyle: form.headingStyle || undefined,
        },
        imageDefaults: {
          style: form.preferredImageStyle || undefined,
          aspectRatio: form.defaultAspectRatio || "16:9",
          brandColors: form.brandColors
            ? form.brandColors
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
        },
        internalLinkingConfig: JSON.stringify({
          maxLinksPerArticle: form.maxLinksPerArticle,
          anchorTextStyle: form.anchorTextStyle || undefined,
        }),
      };

      const res = await fetch(`/api/brands/${brandId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to save brand");
      setMessage({ type: "success", text: "Brand saved successfully" });
    } catch (err) {
      console.error("Failed to save brand:", err);
      setMessage({ type: "error", text: "Failed to save brand" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this brand?")) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/brands/${brandId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete brand");
      router.push("/brands");
    } catch (err) {
      console.error("Failed to delete brand:", err);
      setMessage({ type: "error", text: "Failed to delete brand" });
      setDeleting(false);
    }
  }

  async function handleSitemapSync() {
    if (!sitemapUrl) return;
    setSyncing(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/brands/${brandId}/sitemap-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sitemapUrl }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Sync failed");
      }

      const result = await res.json();
      setMessage({
        type: "success",
        text: `Sitemap synced: ${result.totalUrls} URLs (${result.created} new, ${result.updated} updated)`,
      });
      setSitemapUrl("");
      await loadBrand();
    } catch (err) {
      console.error("Sitemap sync failed:", err);
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Sync failed",
      });
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 sm:py-8 px-4 max-w-4xl">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-start gap-4">
          <Link href="/brands">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold truncate">{form.name || "Edit Brand"}</h1>
            <p className="text-muted-foreground truncate">{form.website}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/brands/${brandId}/optimize`}>
            <Button variant="outline">
              <Search className="mr-2 h-4 w-4" /> Optimize Content
            </Button>
          </Link>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Delete
          </Button>
        </div>
      </div>

      {message && (
        <Alert
          className={`mb-6 ${message.type === "error" ? "border-destructive" : "border-green-500"}`}
        >
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 w-full justify-start">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="voice">Voice & Style</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="linking">Linking</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="sitemap">Sitemap</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Information</CardTitle>
              <CardDescription>
                Basic brand details and identity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Brand Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={form.website}
                  onChange={(e) => updateForm("website", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => updateForm("description", e.target.value)}
                  placeholder="Brief description of this brand..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="voice">
          <Card>
            <CardHeader>
              <CardTitle>Voice & Style</CardTitle>
              <CardDescription>
                Writing preferences for content generation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Tone</Label>
                <Select
                  value={form.tone}
                  onValueChange={(v) => updateForm("tone", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tone..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="authoritative">Authoritative</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Formality Level</Label>
                <Select
                  value={form.formalityLevel}
                  onValueChange={(v) => updateForm("formalityLevel", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select formality..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="formal">Formal</SelectItem>
                    <SelectItem value="semi-formal">Semi-Formal</SelectItem>
                    <SelectItem value="informal">Informal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="preferredPhrases">Preferred Phrases</Label>
                <Textarea
                  id="preferredPhrases"
                  value={form.preferredPhrases}
                  onChange={(e) =>
                    updateForm("preferredPhrases", e.target.value)
                  }
                  placeholder="Comma-separated phrases to include..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="phrasesToAvoid">Phrases to Avoid</Label>
                <Textarea
                  id="phrasesToAvoid"
                  value={form.phrasesToAvoid}
                  onChange={(e) => updateForm("phrasesToAvoid", e.target.value)}
                  placeholder="Comma-separated phrases to avoid..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo">
          <Card>
            <CardHeader>
              <CardTitle>SEO Settings</CardTitle>
              <CardDescription>
                Default search engine optimization preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="keywordCount">Default Target Keyword Count</Label>
                <Input
                  id="keywordCount"
                  type="number"
                  min={1}
                  max={10}
                  value={form.defaultKeywordCount}
                  onChange={(e) =>
                    updateForm("defaultKeywordCount", parseInt(e.target.value) || 3)
                  }
                />
              </div>
              <div>
                <Label htmlFor="contentLength">
                  Preferred Content Length (words)
                </Label>
                <Input
                  id="contentLength"
                  type="number"
                  min={500}
                  max={10000}
                  step={100}
                  value={form.preferredContentLength}
                  onChange={(e) =>
                    updateForm(
                      "preferredContentLength",
                      parseInt(e.target.value) || 2000
                    )
                  }
                />
              </div>
              <div>
                <Label>Heading Style</Label>
                <Select
                  value={form.headingStyle}
                  onValueChange={(v) => updateForm("headingStyle", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select heading style..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="question-based">
                      Question-Based
                    </SelectItem>
                    <SelectItem value="statement-based">
                      Statement-Based
                    </SelectItem>
                    <SelectItem value="how-to">How-To</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="linking">
          <Card>
            <CardHeader>
              <CardTitle>Internal Linking</CardTitle>
              <CardDescription>
                Configure how internal links are added to content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="maxLinks">Max Links per Article</Label>
                <Input
                  id="maxLinks"
                  type="number"
                  min={0}
                  max={20}
                  value={form.maxLinksPerArticle}
                  onChange={(e) =>
                    updateForm(
                      "maxLinksPerArticle",
                      parseInt(e.target.value) || 5
                    )
                  }
                />
              </div>
              <div>
                <Label>Preferred Anchor Text Style</Label>
                <Select
                  value={form.anchorTextStyle}
                  onValueChange={(v) => updateForm("anchorTextStyle", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select anchor text style..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="natural">Natural</SelectItem>
                    <SelectItem value="keyword-rich">Keyword-Rich</SelectItem>
                    <SelectItem value="branded">Branded</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="images">
          <Card>
            <CardHeader>
              <CardTitle>Image Settings</CardTitle>
              <CardDescription>
                Default preferences for image generation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Preferred Image Style</Label>
                <Select
                  value={form.preferredImageStyle}
                  onValueChange={(v) => updateForm("preferredImageStyle", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select image style..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="photographic">Photographic</SelectItem>
                    <SelectItem value="illustration">Illustration</SelectItem>
                    <SelectItem value="abstract">Abstract</SelectItem>
                    <SelectItem value="infographic">Infographic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Default Aspect Ratio</Label>
                <Select
                  value={form.defaultAspectRatio}
                  onValueChange={(v) => updateForm("defaultAspectRatio", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select aspect ratio..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                    <SelectItem value="4:3">4:3 (Standard)</SelectItem>
                    <SelectItem value="1:1">1:1 (Square)</SelectItem>
                    <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="brandColors">Brand Colors</Label>
                <Input
                  id="brandColors"
                  value={form.brandColors}
                  onChange={(e) => updateForm("brandColors", e.target.value)}
                  placeholder="Comma-separated hex values, e.g. #FF5733, #33FF57"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sitemap">
          <Card>
            <CardHeader>
              <CardTitle>Sitemap</CardTitle>
              <CardDescription>
                Synced pages from your website sitemap
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
                <div className="flex-1 w-full min-w-0">
                  <Label htmlFor="sitemapUrl">Sitemap URL</Label>
                  <Input
                    id="sitemapUrl"
                    value={sitemapUrl}
                    onChange={(e) => setSitemapUrl(e.target.value)}
                    placeholder="https://example.com/sitemap.xml"
                  />
                </div>
                <Button onClick={handleSitemapSync} disabled={syncing || !sitemapUrl} className="shrink-0">
                  {syncing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Sync Sitemap
                </Button>
              </div>

              <Separator className="mb-4" />

              {sitemapPages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No sitemap pages synced yet. Enter your sitemap URL above and
                  click Sync.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>URL</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Last Crawled</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sitemapPages.map((page) => (
                      <TableRow key={page.id}>
                        <TableCell className="font-mono text-xs max-w-md truncate">
                          {page.url}
                        </TableCell>
                        <TableCell>{page.title ?? "—"}</TableCell>
                        <TableCell>
                          {page.lastCrawled
                            ? new Date(page.lastCrawled).toLocaleDateString()
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

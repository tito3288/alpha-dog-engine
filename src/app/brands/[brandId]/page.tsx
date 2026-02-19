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

interface VoiceSample {
  sourceUrl?: string;
  content: string;
  title?: string;
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
  voiceSamples: string | null;
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
  minWordCount: number;
  maxWordCount: number;
  headingStyle: string;
  maxLinksPerArticle: number;
  anchorTextStyle: string;
  primaryOfferUrl: string;
  primaryOfferPercent: number;
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
  const [voiceSamples, setVoiceSamples] = useState<VoiceSample[]>([]);
  const [voiceUrl, setVoiceUrl] = useState("");
  const [voiceText, setVoiceText] = useState("");
  const [voiceTitle, setVoiceTitle] = useState("");
  const [importingVoice, setImportingVoice] = useState(false);

  const [form, setForm] = useState<FormData>({
    name: "",
    website: "",
    description: "",
    tone: "",
    formalityLevel: "",
    preferredPhrases: "",
    phrasesToAvoid: "",
    defaultKeywordCount: 3,
    minWordCount: 1500,
    maxWordCount: 2500,
    headingStyle: "",
    maxLinksPerArticle: 5,
    anchorTextStyle: "",
    primaryOfferUrl: "",
    primaryOfferPercent: 50,
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

      let parsedVoiceSamples: VoiceSample[] = [];
      if (brand.voiceSamples) {
        try {
          parsedVoiceSamples = JSON.parse(brand.voiceSamples);
        } catch {
          parsedVoiceSamples = [];
        }
      }
      setVoiceSamples(parsedVoiceSamples);

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
        minWordCount: (seo.minWordCount as number) ?? (seo.preferredContentLength as number) ?? 1500,
        maxWordCount: (seo.maxWordCount as number) ?? 2500,
        headingStyle: (seo.headingStyle as string) ?? "",
        maxLinksPerArticle: (linking.maxLinksPerArticle as number) ?? 5,
        anchorTextStyle: (linking.anchorTextStyle as string) ?? "",
        primaryOfferUrl: (linking.primaryOfferUrl as string) ?? "",
        primaryOfferPercent: (linking.primaryOfferPercent as number) ?? 50,
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
          minWordCount: form.minWordCount,
          maxWordCount: form.maxWordCount,
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
        internalLinkingConfig: {
          maxLinksPerArticle: form.maxLinksPerArticle,
          anchorTextStyle: form.anchorTextStyle || undefined,
          primaryOfferUrl: form.primaryOfferUrl || undefined,
          primaryOfferPercent: form.primaryOfferUrl ? form.primaryOfferPercent : undefined,
        },
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

  async function handleImportVoiceUrl() {
    if (!voiceUrl) return;
    setImportingVoice(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/brands/${brandId}/voice-samples`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: voiceUrl }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to import voice sample");
      }

      const result = await res.json();
      setVoiceSamples(result.samples);
      setVoiceUrl("");
      setMessage({ type: "success", text: "Voice sample imported successfully" });
    } catch (err) {
      console.error("Voice import failed:", err);
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to import voice sample",
      });
    } finally {
      setImportingVoice(false);
    }
  }

  async function handleAddVoiceText() {
    if (!voiceText) return;
    setImportingVoice(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/brands/${brandId}/voice-samples`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: voiceText, title: voiceTitle || undefined }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add voice sample");
      }

      const result = await res.json();
      setVoiceSamples(result.samples);
      setVoiceText("");
      setVoiceTitle("");
      setMessage({ type: "success", text: "Voice sample added successfully" });
    } catch (err) {
      console.error("Voice add failed:", err);
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to add voice sample",
      });
    } finally {
      setImportingVoice(false);
    }
  }

  async function handleDeleteVoiceSample(index: number) {
    setMessage(null);

    try {
      const res = await fetch(`/api/brands/${brandId}/voice-samples`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete voice sample");
      }

      const result = await res.json();
      setVoiceSamples(result.samples);
      setMessage({ type: "success", text: "Voice sample removed" });
    } catch (err) {
      console.error("Voice delete failed:", err);
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to delete voice sample",
      });
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

              <Separator className="my-4" />

              <div>
                <Label className="text-base font-semibold">Voice Reference Samples</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Add up to 5 writing samples to match the brand&apos;s voice. Import from a URL or paste text directly.
                </p>

                {voiceSamples.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {voiceSamples.map((sample, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-3 border rounded-md bg-muted/50">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {sample.title || `Sample ${idx + 1}`}
                          </p>
                          {sample.sourceUrl && (
                            <p className="text-xs text-muted-foreground truncate">
                              {sample.sourceUrl}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {sample.content.slice(0, 150)}...
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={() => handleDeleteVoiceSample(idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {voiceSamples.length < 5 && (
                  <>
                    <div className="flex flex-col sm:flex-row gap-2 mb-3">
                      <Input
                        value={voiceUrl}
                        onChange={(e) => setVoiceUrl(e.target.value)}
                        placeholder="https://example.com/article"
                        className="flex-1"
                      />
                      <Button
                        onClick={handleImportVoiceUrl}
                        disabled={importingVoice || !voiceUrl}
                        className="shrink-0"
                      >
                        {importingVoice ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        Import URL
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Input
                        value={voiceTitle}
                        onChange={(e) => setVoiceTitle(e.target.value)}
                        placeholder="Sample title (optional)"
                      />
                      <Textarea
                        value={voiceText}
                        onChange={(e) => setVoiceText(e.target.value)}
                        placeholder="Paste writing sample text here..."
                        rows={4}
                      />
                      <Button
                        variant="outline"
                        onClick={handleAddVoiceText}
                        disabled={importingVoice || !voiceText}
                      >
                        Add Text Sample
                      </Button>
                    </div>
                  </>
                )}

                {voiceSamples.length >= 5 && (
                  <p className="text-sm text-muted-foreground">
                    Maximum of 5 voice samples reached. Remove one to add another.
                  </p>
                )}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minWordCount">Min Word Count</Label>
                  <Input
                    id="minWordCount"
                    type="number"
                    min={500}
                    max={10000}
                    step={100}
                    value={form.minWordCount}
                    onChange={(e) =>
                      updateForm("minWordCount", parseInt(e.target.value) || 1500)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="maxWordCount">Max Word Count</Label>
                  <Input
                    id="maxWordCount"
                    type="number"
                    min={500}
                    max={10000}
                    step={100}
                    value={form.maxWordCount}
                    onChange={(e) =>
                      updateForm("maxWordCount", parseInt(e.target.value) || 2500)
                    }
                  />
                </div>
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

              <Separator className="my-4" />

              <div>
                <Label htmlFor="primaryOfferUrl">Primary Offer URL</Label>
                <Input
                  id="primaryOfferUrl"
                  value={form.primaryOfferUrl}
                  onChange={(e) => updateForm("primaryOfferUrl", e.target.value)}
                  placeholder="/your-primary-offer-page"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  The main landing page that should receive the majority of internal links.
                </p>
              </div>

              {form.primaryOfferUrl && (
                <div>
                  <Label htmlFor="primaryOfferPercent">
                    Primary Offer Link Percentage ({form.primaryOfferPercent}%)
                  </Label>
                  <Input
                    id="primaryOfferPercent"
                    type="number"
                    min={0}
                    max={100}
                    value={form.primaryOfferPercent}
                    onChange={(e) =>
                      updateForm("primaryOfferPercent", parseInt(e.target.value) || 50)
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {form.primaryOfferPercent}% of links to primary offer, {100 - form.primaryOfferPercent}% distributed across other sitemap pages.
                  </p>
                </div>
              )}
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

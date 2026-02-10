"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Globe, FileText, Loader2 } from "lucide-react";

interface BrandWithCount {
  id: number;
  name: string;
  website: string;
  description: string | null;
  _count: { contentJobs: number };
}

export default function BrandsPage() {
  const router = useRouter();
  const [brands, setBrands] = useState<BrandWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newWebsite, setNewWebsite] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/brands")
      .then((res) => res.json())
      .then((data) => {
        // Ensure data is an array (API might return error object)
        setBrands(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Failed to fetch brands:", err);
        setBrands([]); // Ensure brands is always an array
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName || !newWebsite) return;

    setCreating(true);
    try {
      const res = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, website: newWebsite }),
      });

      if (!res.ok) throw new Error("Failed to create brand");

      const brand = await res.json();
      router.push(`/brands/${brand.id}`);
    } catch (err) {
      console.error("Failed to create brand:", err);
    } finally {
      setCreating(false);
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
    <div className="container mx-auto py-4 sm:py-8 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Brands</h1>
          <p className="text-muted-foreground mt-1">
            Manage your brand profiles
          </p>
        </div>
        <Button onClick={() => setShowNewForm(!showNewForm)} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" /> New Brand
        </Button>
      </div>

      {showNewForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Create New Brand</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="flex-1 w-full min-w-0">
                <Label htmlFor="name">Brand Name</Label>
                <Input
                  id="name"
                  placeholder="Acme Corp"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>
              <div className="flex-1 w-full min-w-0">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  placeholder="https://acme.com"
                  value={newWebsite}
                  onChange={(e) => setNewWebsite(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                      Creating...
                    </>
                  ) : (
                    "Create"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowNewForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {brands.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No brands yet</h2>
          <p className="text-muted-foreground mb-4">
            Create your first brand to get started with content generation.
          </p>
          <Button onClick={() => setShowNewForm(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create Brand
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands.map((brand) => (
            <Link key={brand.id} href={`/brands/${brand.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle>{brand.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    {brand.website}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {brand.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {brand.description}
                    </p>
                  )}
                  <Badge variant="secondary">
                    <FileText className="mr-1 h-3 w-3" />
                    {brand._count.contentJobs} content{" "}
                    {brand._count.contentJobs === 1 ? "job" : "jobs"}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

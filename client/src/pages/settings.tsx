import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  User,
  Shield,
  Key,
  CreditCard,
  Copy,
  Trash2,
  Plus,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import type { ApiKey } from "@shared/schema";

const profileSchema = z.object({
  displayName: z.string().optional(),
  email: z.string().email("Invalid email address"),
  company: z.string().optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type PasswordForm = z.infer<typeof passwordSchema>;

function ProfileTab() {
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user?.displayName || "",
      email: user?.email || "",
      company: user?.company || "",
      phone: user?.phone || "",
      bio: user?.bio || "",
    },
  });

  const updateProfile = useMutation({
    mutationFn: async (data: ProfileForm) => {
      const res = await apiRequest("PATCH", "/api/profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Profile updated", description: "Your profile has been saved successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Card data-testid="card-profile">
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>Update your personal information</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => updateProfile.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-display-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} data-testid="input-email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-company" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-phone" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea {...field} data-testid="input-bio" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={updateProfile.isPending} data-testid="button-save-profile">
              {updateProfile.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function SecurityTab() {
  const { toast } = useToast();

  const form = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const changePassword = useMutation({
    mutationFn: async (data: PasswordForm) => {
      const res = await apiRequest("POST", "/api/profile/change-password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      return res.json();
    },
    onSuccess: () => {
      form.reset();
      toast({ title: "Password changed", description: "Your password has been updated successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Card data-testid="card-security">
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
        <CardDescription>Update your account password</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => changePassword.mutate(data))} className="space-y-4 max-w-md">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} data-testid="input-current-password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} data-testid="input-new-password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} data-testid="input-confirm-password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={changePassword.isPending} data-testid="button-change-password">
              {changePassword.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Change Password
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function ApiKeysTab() {
  const { toast } = useToast();
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [keyLabel, setKeyLabel] = useState("Default");

  const { data: keys, isLoading } = useQuery<ApiKey[]>({
    queryKey: ["/api/keys"],
  });

  const generateKey = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/keys", { label: keyLabel });
      return res.json();
    },
    onSuccess: (data: { key: string }) => {
      setNewKeyValue(data.key);
      setKeyLabel("Default");
      queryClient.invalidateQueries({ queryKey: ["/api/keys"] });
    },
    onError: (error: Error) => {
      const match = error.message.match(/429:/);
      if (match) {
        toast({
          title: "Rate limited",
          description: "You can only generate a new API key once every 24 hours.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    },
  });

  const revokeKey = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/keys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/keys"] });
      toast({ title: "Key revoked", description: "The API key has been revoked." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "API key copied to clipboard." });
  };

  return (
    <>
      <Card data-testid="card-api-keys">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>Manage your API keys for programmatic access</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={keyLabel}
              onChange={(e) => setKeyLabel(e.target.value)}
              placeholder="Key label"
              className="w-40"
              data-testid="input-key-label"
            />
            <Button
              onClick={() => generateKey.mutate()}
              disabled={generateKey.isPending}
              data-testid="button-generate-key"
            >
              {generateKey.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Generate New Key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" data-testid={`skeleton-key-${i}`} />
              ))}
            </div>
          ) : keys && keys.length > 0 ? (
            <div className="space-y-3">
              {keys.map((k) => (
                <div
                  key={k.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
                  data-testid={`item-key-${k.id}`}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm" data-testid={`text-key-prefix-${k.id}`}>{k.keyPrefix}</span>
                      <Badge variant="secondary" data-testid={`badge-key-label-${k.id}`}>{k.label}</Badge>
                      {k.revokedAt && (
                        <Badge variant="destructive" data-testid={`badge-key-revoked-${k.id}`}>Revoked</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground" data-testid={`text-key-created-${k.id}`}>
                      Created {formatDistanceToNow(new Date(k.createdAt), { addSuffix: true })}
                      {k.lastUsedAt && ` | Last used ${formatDistanceToNow(new Date(k.lastUsedAt), { addSuffix: true })}`}
                    </span>
                  </div>
                  {!k.revokedAt && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => revokeKey.mutate(k.id)}
                      disabled={revokeKey.isPending}
                      data-testid={`button-revoke-key-${k.id}`}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Revoke
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8" data-testid="text-no-keys">No API keys generated yet</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!newKeyValue} onOpenChange={(open) => !open && setNewKeyValue(null)}>
        <DialogContent data-testid="dialog-new-key">
          <DialogHeader>
            <DialogTitle>API Key Generated</DialogTitle>
            <DialogDescription>Copy your API key now. This key will only be shown once.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-md border bg-muted p-3">
            <code className="flex-1 text-sm font-mono break-all" data-testid="text-new-key-value">{newKeyValue}</code>
            <Button size="icon" variant="ghost" onClick={() => newKeyValue && copyToClipboard(newKeyValue)} data-testid="button-copy-key">
              <Copy />
            </Button>
          </div>
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="w-4 h-4" />
            <span data-testid="text-key-warning">This key will only be shown once. Store it securely.</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CreditsTab() {
  const { toast } = useToast();
  const [minutes, setMinutes] = useState("");

  const { data: credits, isLoading } = useQuery<{ balance: number; balanceMinutes: number }>({
    queryKey: ["/api/credits"],
  });

  const purchaseCredits = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/credits/purchase", {
        minutes: parseInt(minutes),
        paymentMethod: "card",
      });
      return res.json();
    },
    onSuccess: () => {
      setMinutes("");
      queryClient.invalidateQueries({ queryKey: ["/api/credits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Credits purchased", description: `${minutes} minutes of credit have been added to your account.` });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <Card data-testid="card-credit-balance">
        <CardHeader>
          <CardTitle>Credit Balance</CardTitle>
          <CardDescription>Your current quantum computing credits</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-5 w-32" />
            </div>
          ) : (
            <div>
              <p className="text-3xl font-bold" data-testid="text-credit-seconds">
                {credits?.balance?.toFixed(1)} seconds
              </p>
              <p className="text-lg text-muted-foreground" data-testid="text-credit-minutes">
                {credits?.balanceMinutes?.toFixed(2)} minutes
              </p>
              <p className="text-sm text-muted-foreground mt-2" data-testid="text-initial-credit">
                Initial credit: 11 minutes (660 seconds)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-purchase-credits">
        <CardHeader>
          <CardTitle>Purchase Credits</CardTitle>
          <CardDescription>Add more computing time to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Minutes to purchase</label>
              <Input
                type="number"
                min="1"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="Enter minutes"
                data-testid="input-purchase-minutes"
              />
            </div>
            <Button
              onClick={() => purchaseCredits.mutate()}
              disabled={purchaseCredits.isPending || !minutes || parseInt(minutes) < 1}
              data-testid="button-purchase-credits"
            >
              {purchaseCredits.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Purchase
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6" data-testid="page-settings">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Account Settings</h1>
        <p className="text-muted-foreground" data-testid="text-page-subtitle">Manage your account, security, and billing</p>
      </div>

      <Tabs defaultValue="profile" data-testid="tabs-settings">
        <TabsList data-testid="tabs-list-settings">
          <TabsTrigger value="profile" data-testid="tab-profile">
            <User className="w-4 h-4 mr-1" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" data-testid="tab-security">
            <Shield className="w-4 h-4 mr-1" />
            Security
          </TabsTrigger>
          <TabsTrigger value="api-keys" data-testid="tab-api-keys">
            <Key className="w-4 h-4 mr-1" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="credits" data-testid="tab-credits">
            <CreditCard className="w-4 h-4 mr-1" />
            Credits & Billing
          </TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="mt-4">
          <ProfileTab />
        </TabsContent>
        <TabsContent value="security" className="mt-4">
          <SecurityTab />
        </TabsContent>
        <TabsContent value="api-keys" className="mt-4">
          <ApiKeysTab />
        </TabsContent>
        <TabsContent value="credits" className="mt-4">
          <CreditsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
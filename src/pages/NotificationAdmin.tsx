import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Save, X, Send, Calendar, Users, Play, Pause, Trophy } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import AppLayout from "@/components/layout/AppLayout";

// ── Types ──────────────────────────────────────────────
interface NotificationTemplate {
  id: string;
  name: string;
  type: string;
  content_template: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high';
  is_active: boolean;
  variables: string[];
  created_at: string;
}

interface FrequencyCap {
  id: string;
  name: string;
  description: string;
  notification_type: string;
  max_notifications: number;
  time_window_minutes: number;
  priority_threshold: string;
  is_active: boolean;
}

interface ABTest {
  id: string;
  name: string;
  description: string;
  status: string;
  template_id: string;
  start_date: string;
  end_date: string;
  target_sample_size: number;
  winner_variant_id: string;
}

interface Variant {
  id: string;
  ab_test_id: string;
  name: string;
  content_template: string;
  traffic_percentage: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  clicked_count: number;
}

// ── Templates Tab ──────────────────────────────────────
function TemplatesTab() {
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Partial<NotificationTemplate>>({});
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['notification-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as NotificationTemplate[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (template: Partial<NotificationTemplate>) => {
      const { data, error } = await supabase
        .from('notification_templates')
        .insert({
          name: template.name ?? '',
          type: template.type ?? '',
          content_template: template.content_template ?? '',
          description: template.description ?? null,
          priority: template.priority || 'medium',
          is_active: template.is_active ?? true,
          variables: template.variables || [],
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      toast.success('Template created');
      setIsCreating(false);
      setFormData({});
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<NotificationTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('notification_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      toast.success('Template updated');
      setIsEditing(null);
      setFormData({});
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notification_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      toast.success('Template deleted');
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });

  const handleSave = () => {
    if (isCreating) createMutation.mutate(formData);
    else if (isEditing) updateMutation.mutate({ ...formData, id: isEditing });
  };

  const handleCancel = () => { setIsCreating(false); setIsEditing(null); setFormData({}); };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  if (isLoading) return <div className="p-4 text-muted-foreground">Loading templates...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setIsCreating(true)} disabled={isCreating} size="sm">
          <Plus className="w-4 h-4 mr-2" /> New Template
        </Button>
      </div>

      {isCreating && (
        <Card className="p-6 border-primary">
          <h3 className="text-lg font-semibold mb-4">Create New Template</h3>
          <div className="space-y-4">
            <div><Label>Name</Label><Input placeholder="e.g., business_approved" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
            <div>
              <Label>Type</Label>
              <Select value={formData.type ?? ''} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {['message','review','business','verification','certification','payment','follower','like','bookmark','system'].map(t => (
                    <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Content Template</Label><Textarea placeholder="Your business {{businessName}} has been approved" value={formData.content_template || ''} onChange={(e) => setFormData({ ...formData, content_template: e.target.value })} className="min-h-[80px]" /><p className="text-xs text-muted-foreground mt-1">Use {"{{variable}}"} for placeholders</p></div>
            <div><Label>Description</Label><Input placeholder="Brief description" value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></div>
            <div>
              <Label>Priority</Label>
              <Select value={formData.priority ?? ''} onValueChange={(v: any) => setFormData({ ...formData, priority: v })}>
                <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Variables (comma-separated)</Label><Input placeholder="businessName, userName" value={formData.variables?.join(', ') || ''} onChange={(e) => setFormData({ ...formData, variables: e.target.value.split(',').map(v => v.trim()).filter(Boolean) })} /></div>
            <div className="flex items-center space-x-2"><Switch checked={formData.is_active ?? true} onCheckedChange={(c) => setFormData({ ...formData, is_active: c })} /><Label>Active</Label></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancel}><X className="w-4 h-4 mr-2" />Cancel</Button>
              <Button onClick={handleSave}><Save className="w-4 h-4 mr-2" />Create</Button>
            </div>
          </div>
        </Card>
      )}

      {templates?.map((template) => (
        <Card key={template.id} className="p-6">
          {isEditing === template.id ? (
            <div className="space-y-4">
              <div><Label>Name</Label><Input value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
              <div><Label>Content</Label><Textarea value={formData.content_template || ''} onChange={(e) => setFormData({ ...formData, content_template: e.target.value })} className="min-h-[80px]" /></div>
              <div><Label>Description</Label><Input value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCancel}><X className="w-4 h-4 mr-2" />Cancel</Button>
                <Button onClick={handleSave}><Save className="w-4 h-4 mr-2" />Save</Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold">{template.name}</h3>
                  <Badge variant={getPriorityColor(template.priority)}>{template.priority}</Badge>
                  <Badge variant="outline">{template.type}</Badge>
                  {!template.is_active && <Badge variant="secondary">Inactive</Badge>}
                </div>
                {template.description && <p className="text-sm text-muted-foreground mb-3">{template.description}</p>}
                <div className="bg-muted p-3 rounded-md mb-3"><code className="text-sm">{template.content_template}</code></div>
                <div className="flex gap-2">
                  {template.variables.map((v: string) => <Badge key={v} variant="secondary" className="text-xs">{"{{"}{v}{"}}"}</Badge>)}
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <Button variant="outline" size="sm" onClick={() => { setIsEditing(template.id); setFormData(template); }}><Edit className="w-4 h-4" /></Button>
                <Button variant="outline" size="sm" onClick={() => { if (confirm('Delete this template?')) deleteMutation.mutate(template.id); }}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

// ── Bulk Send Tab ──────────────────────────────────────
function BulkSendTab() {
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [sendImmediately, setSendImmediately] = useState(true);
  const [scheduledFor, setScheduledFor] = useState("");
  const [targetType, setTargetType] = useState<"all" | "criteria" | "specific">("criteria");
  const [criteria, setCriteria] = useState({ subscription: "", has_business: false, created_after: "", created_before: "" });
  const [specificUserIds, setSpecificUserIds] = useState("");
  const [metadata, setMetadata] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const { data: templates } = useQuery({
    queryKey: ['notification-templates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('notification_templates').select('*').eq('is_active', true).order('name');
      if (error) throw error;
      return data as NotificationTemplate[];
    },
  });

  const { data: scheduledNotifications } = useQuery({
    queryKey: ['scheduled-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase.from('scheduled_notifications').select('*, notification_templates(name, type)').order('scheduled_for', { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.functions.invoke('send-bulk-notification', { body: payload });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-notifications'] });
      toast.success(sendImmediately ? 'Notifications sent' : 'Notification scheduled');
      resetForm();
    },
    onError: (error) => toast.error(`Failed: ${error.message}`),
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('scheduled_notifications').update({ status: 'cancelled' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-notifications'] });
      toast.success('Cancelled');
    },
  });

  const resetForm = () => {
    setSelectedTemplate(""); setSendImmediately(true); setScheduledFor(""); setTargetType("criteria");
    setCriteria({ subscription: "", has_business: false, created_after: "", created_before: "" });
    setSpecificUserIds(""); setMetadata({});
  };

  const handleSend = () => {
    if (!selectedTemplate) { toast.error('Select a template'); return; }
    if (!sendImmediately && !scheduledFor) { toast.error('Select a time'); return; }

    let payload: any = { template_id: selectedTemplate, send_immediately: sendImmediately, metadata };
    if (!sendImmediately) payload.scheduled_for = scheduledFor;

    if (targetType === "all") payload.target_criteria = {};
    else if (targetType === "criteria") {
      payload.target_criteria = Object.fromEntries(Object.entries(criteria).filter(([_, v]) => v !== "" && v !== false));
    } else {
      const userIds = specificUserIds.split(',').map(id => id.trim()).filter(Boolean);
      if (!userIds.length) { toast.error('Enter at least one user ID'); return; }
      payload.target_user_ids = userIds;
    }

    sendMutation.mutate(payload);
  };

  const selectedTemplateData = templates?.find(t => t.id === selectedTemplate);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <Label>Select Template</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger><SelectValue placeholder="Choose a template" /></SelectTrigger>
              <SelectContent>
                {templates?.map((t) => <SelectItem key={t.id} value={t.id}>{t.name} ({t.type})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {selectedTemplateData && (
            <div className="p-4 bg-muted rounded-md">
              <p className="text-sm font-medium mb-2">Preview:</p>
              <code className="text-sm">{selectedTemplateData.content_template}</code>
            </div>
          )}

          {selectedTemplateData && selectedTemplateData.variables.length > 0 && (
            <div>
              <Label>Template Variables</Label>
              <div className="space-y-2 mt-2">
                {selectedTemplateData.variables.map((v: string) => (
                  <Input key={v} placeholder={v} value={metadata[v] || ''} onChange={(e) => setMetadata({ ...metadata, [v]: e.target.value })} />
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2"><Switch checked={sendImmediately} onCheckedChange={setSendImmediately} /><Label>Send Immediately</Label></div>
          {!sendImmediately && <div><Label>Schedule For</Label><Input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} /></div>}

          <div>
            <Label>Target Audience</Label>
            <Select value={targetType} onValueChange={(v: any) => setTargetType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Users</SelectItem><SelectItem value="criteria">By Criteria</SelectItem><SelectItem value="specific">Specific User IDs</SelectItem></SelectContent>
            </Select>
          </div>

          {targetType === "criteria" && (
            <div className="space-y-3 p-4 border rounded-md">
              <div><Label>Subscription Tier</Label>
                <Select value={criteria.subscription} onValueChange={(v) => setCriteria({ ...criteria, subscription: v })}>
                  <SelectTrigger><SelectValue placeholder="Any tier" /></SelectTrigger>
                  <SelectContent><SelectItem value="">Any</SelectItem><SelectItem value="individual">Individual</SelectItem><SelectItem value="small_business">Small Business</SelectItem><SelectItem value="organization">Organization</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2"><Switch checked={criteria.has_business} onCheckedChange={(c) => setCriteria({ ...criteria, has_business: c })} /><Label>Has Business</Label></div>
              <div><Label>Created After</Label><Input type="date" value={criteria.created_after} onChange={(e) => setCriteria({ ...criteria, created_after: e.target.value })} /></div>
              <div><Label>Created Before</Label><Input type="date" value={criteria.created_before} onChange={(e) => setCriteria({ ...criteria, created_before: e.target.value })} /></div>
            </div>
          )}

          {targetType === "specific" && (
            <div><Label>User IDs (comma-separated)</Label><Textarea placeholder="uuid1, uuid2..." value={specificUserIds} onChange={(e) => setSpecificUserIds(e.target.value)} className="min-h-[80px]" /></div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={resetForm}><X className="w-4 h-4 mr-2" />Reset</Button>
            <Button onClick={handleSend} disabled={sendMutation.isPending}>
              {sendImmediately ? <><Send className="w-4 h-4 mr-2" />Send Now</> : <><Calendar className="w-4 h-4 mr-2" />Schedule</>}
            </Button>
          </div>
        </div>
      </Card>

      <h3 className="text-lg font-semibold">Scheduled Notifications</h3>
      {scheduledNotifications?.map((n: any) => (
        <Card key={n.id} className="p-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-semibold">{n.notification_templates?.name}</h4>
                <Badge variant={n.status === 'sent' ? 'default' : n.status === 'failed' ? 'destructive' : n.status === 'cancelled' ? 'secondary' : 'outline'}>{n.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Scheduled: {new Date(n.scheduled_for).toLocaleString()}</p>
              {n.sent_count > 0 && <p className="text-sm"><Users className="w-4 h-4 inline mr-1" />Sent: {n.sent_count}, Failed: {n.failed_count}</p>}
            </div>
            {n.status === 'pending' && <Button variant="outline" size="sm" onClick={() => cancelMutation.mutate(n.id)}><X className="w-4 h-4 mr-2" />Cancel</Button>}
          </div>
        </Card>
      ))}
      {scheduledNotifications?.length === 0 && <Card className="p-8 text-center text-muted-foreground">No scheduled notifications</Card>}
    </div>
  );
}

// ── A/B Testing Tab ────────────────────────────────────
function ABTestingTab() {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTest, setSelectedTest] = useState<ABTest | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(false);
  const [testName, setTestName] = useState("");
  const [testDescription, setTestDescription] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [targetSampleSize, setTargetSampleSize] = useState(1000);
  const [variantA, setVariantA] = useState("");
  const [variantB, setVariantB] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    loadTests();
    loadTemplates();
  }, []);

  const loadTests = async () => {
    const { data } = await supabase.from('notification_ab_tests').select('*').order('created_at', { ascending: false });
    setTests((data ?? []) as ABTest[]);
  };

  const loadTemplates = async () => {
    const { data } = await supabase.from('notification_templates').select('*').eq('is_active', true);
    setTemplates(data || []);
  };

  const loadVariants = async (testId: string) => {
    const { data } = await supabase.from('notification_ab_variants').select('*').eq('ab_test_id', testId);
    setVariants((data ?? []) as Variant[]);
  };

  const createTest = async () => {
    if (!testName || !selectedTemplate || !variantA || !variantB) { toast.error('Fill all required fields'); return; }
    setLoading(true);
    try {
      const { data: test, error } = await supabase.from('notification_ab_tests').insert({ name: testName, description: testDescription, template_id: selectedTemplate, target_sample_size: targetSampleSize, status: 'draft' }).select().single();
      if (error) throw error;
      await supabase.from('notification_ab_variants').insert([
        { ab_test_id: test.id, name: 'Variant A', content_template: variantA, traffic_percentage: 50 },
        { ab_test_id: test.id, name: 'Variant B', content_template: variantB, traffic_percentage: 50 },
      ]);
      toast.success('A/B test created');
      loadTests();
      setTestName(""); setTestDescription(""); setSelectedTemplate(""); setVariantA(""); setVariantB(""); setShowCreate(false);
    } catch { toast.error('Failed to create test'); } finally { setLoading(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('notification_ab_tests').update({ status, ...(status === 'running' ? { start_date: new Date().toISOString() } : {}) }).eq('id', id);
    toast.success(`Test ${status === 'running' ? 'started' : 'paused'}`);
    loadTests();
  };

  const declareWinner = async (testId: string, variantId: string) => {
    await supabase.from('notification_ab_tests').update({ status: 'completed', winner_variant_id: variantId, end_date: new Date().toISOString() }).eq('id', testId);
    toast.success('Winner declared');
    loadTests();
  };

  const calcMetrics = (v: Variant) => ({
    deliveryRate: v.sent_count > 0 ? ((v.delivered_count / v.sent_count) * 100).toFixed(1) : '0',
    readRate: v.delivered_count > 0 ? ((v.read_count / v.delivered_count) * 100).toFixed(1) : '0',
    clickRate: v.read_count > 0 ? ((v.clicked_count / v.read_count) * 100).toFixed(1) : '0',
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}><Plus className="w-4 h-4 mr-2" />New Test</Button>
      </div>

      {showCreate && (
        <Card className="p-6 border-primary">
          <h3 className="text-lg font-semibold mb-4">Create A/B Test</h3>
          <div className="space-y-4">
            <div><Label>Test Name</Label><Input value={testName} onChange={(e) => setTestName(e.target.value)} placeholder="Campaign Test" /></div>
            <div><Label>Description</Label><Textarea value={testDescription} onChange={(e) => setTestDescription(e.target.value)} rows={2} /></div>
            <div>
              <Label>Base Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                <SelectContent>{templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Sample Size</Label><Input type="number" value={targetSampleSize} onChange={(e) => setTargetSampleSize(parseInt(e.target.value))} /></div>
            <div className="grid md:grid-cols-2 gap-4">
              <div><Label>Variant A</Label><Textarea value={variantA} onChange={(e) => setVariantA(e.target.value)} rows={3} /></div>
              <div><Label>Variant B</Label><Textarea value={variantB} onChange={(e) => setVariantB(e.target.value)} rows={3} /></div>
            </div>
            <Button onClick={createTest} disabled={loading} className="w-full"><Plus className="h-4 w-4 mr-2" />Create</Button>
          </div>
        </Card>
      )}

      {tests.map((test) => (
        <Card key={test.id} className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h4 className="font-semibold">{test.name}</h4>
              <p className="text-sm text-muted-foreground">{test.description}</p>
            </div>
            <div className="flex gap-2">
              {test.status === 'draft' && <Button size="sm" onClick={() => updateStatus(test.id, 'running')}><Play className="h-4 w-4 mr-2" />Start</Button>}
              {test.status === 'running' && <Button size="sm" variant="outline" onClick={() => updateStatus(test.id, 'paused')}><Pause className="h-4 w-4 mr-2" />Pause</Button>}
            </div>
          </div>
          <Badge variant={test.status === 'running' ? 'default' : 'secondary'}>{test.status}</Badge>

          {selectedTest?.id === test.id && variants.length > 0 && (
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              {variants.map((v) => {
                const m = calcMetrics(v);
                return (
                  <Card key={v.id} className={test.winner_variant_id === v.id ? 'border-yellow-500' : ''}>
                    <CardHeader><CardTitle className="flex items-center justify-between text-base">{v.name}{test.winner_variant_id === v.id && <Trophy className="h-5 w-5 text-yellow-500" />}</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><p className="text-muted-foreground">Sent</p><p className="font-bold">{v.sent_count}</p></div>
                        <div><p className="text-muted-foreground">Delivered</p><p className="font-bold">{m.deliveryRate}%</p></div>
                        <div><p className="text-muted-foreground">Read</p><p className="font-bold">{m.readRate}%</p></div>
                        <div><p className="text-muted-foreground">Click</p><p className="font-bold">{m.clickRate}%</p></div>
                      </div>
                      {test.status === 'running' && !test.winner_variant_id && (
                        <Button size="sm" className="w-full mt-3" onClick={() => declareWinner(test.id, v.id)}>Declare Winner</Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {selectedTest?.id !== test.id && (
            <Button variant="outline" size="sm" className="mt-3" onClick={() => { setSelectedTest(test); loadVariants(test.id); }}>View Details</Button>
          )}
        </Card>
      ))}
    </div>
  );
}

// ── Frequency Caps Tab ─────────────────────────────────
function FrequencyCapsTab() {
  const [caps, setCaps] = useState<FrequencyCap[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [notificationType, setNotificationType] = useState("");
  const [maxNotifications, setMaxNotifications] = useState(10);
  const [timeWindowMinutes, setTimeWindowMinutes] = useState(60);
  const [priorityThreshold, setPriorityThreshold] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => { loadCaps(); }, []);

  const loadCaps = async () => {
    const { data } = await supabase.from('notification_frequency_caps').select('*').order('created_at', { ascending: false });
    setCaps((data ?? []) as FrequencyCap[]);
  };

  const resetForm = () => {
    setName(""); setDescription(""); setNotificationType(""); setMaxNotifications(10);
    setTimeWindowMinutes(60); setPriorityThreshold(""); setIsActive(true); setEditingId(null);
  };

  const handleSave = async () => {
    if (!name || maxNotifications <= 0 || timeWindowMinutes <= 0) { toast.error('Fill required fields'); return; }
    setLoading(true);
    try {
      const data = { name, description, notification_type: notificationType || null, max_notifications: maxNotifications, time_window_minutes: timeWindowMinutes, priority_threshold: priorityThreshold || null, is_active: isActive };
      if (editingId) await supabase.from('notification_frequency_caps').update(data).eq('id', editingId);
      else await supabase.from('notification_frequency_caps').insert(data);
      toast.success(editingId ? 'Updated' : 'Created');
      loadCaps(); resetForm();
    } catch { toast.error('Failed to save'); } finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this cap?')) return;
    await supabase.from('notification_frequency_caps').delete().eq('id', id);
    toast.success('Deleted'); loadCaps();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('notification_frequency_caps').update({ is_active: !current }).eq('id', id);
    loadCaps();
  };

  const formatTime = (m: number) => m < 60 ? `${m}m` : m < 1440 ? `${(m/60).toFixed(1)}h` : `${(m/1440).toFixed(1)}d`;

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h3 className="font-semibold mb-4">{editingId ? 'Edit' : 'Create'} Frequency Cap</h3>
        <div className="space-y-3">
          <div><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Max Notifications *</Label><Input type="number" min="1" value={maxNotifications} onChange={(e) => setMaxNotifications(parseInt(e.target.value))} /></div>
            <div><Label>Time Window (min) *</Label><Input type="number" min="1" value={timeWindowMinutes} onChange={(e) => setTimeWindowMinutes(parseInt(e.target.value))} /><p className="text-xs text-muted-foreground">{formatTime(timeWindowMinutes)}</p></div>
          </div>
          <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={isActive} onCheckedChange={setIsActive} /></div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={loading} className="flex-1">{editingId ? 'Update' : 'Create'}</Button>
            {editingId && <Button variant="outline" onClick={resetForm}>Cancel</Button>}
          </div>
        </div>
      </Card>

      {caps.map((cap) => (
        <Card key={cap.id} className={`p-6 ${!cap.is_active ? 'opacity-60' : ''}`}>
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold">{cap.name}</h4>
              <p className="text-sm text-muted-foreground">{cap.description}</p>
              <div className="flex gap-4 mt-2 text-sm">
                <span>Max: {cap.max_notifications}</span>
                <span>Window: {formatTime(cap.time_window_minutes)}</span>
                <span>Type: {cap.notification_type || 'All'}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Switch checked={cap.is_active} onCheckedChange={() => toggleActive(cap.id, cap.is_active)} />
              <Button size="sm" variant="ghost" onClick={() => { setEditingId(cap.id); setName(cap.name); setDescription(cap.description || ""); setNotificationType(cap.notification_type || ""); setMaxNotifications(cap.max_notifications); setTimeWindowMinutes(cap.time_window_minutes); setPriorityThreshold(cap.priority_threshold || ""); setIsActive(cap.is_active); }}><Edit className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => handleDelete(cap.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────
export default function NotificationAdmin() {
  const { isAdmin, isLoading: authLoading } = useAdminAccess();

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin) return null;

  return (
    <AppLayout title="Notification Admin" withHeader>
      <div className="container max-w-4xl py-6 px-4">
        <Tabs defaultValue="templates" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Send</TabsTrigger>
            <TabsTrigger value="ab-testing">A/B Tests</TabsTrigger>
            <TabsTrigger value="frequency">Freq. Caps</TabsTrigger>
          </TabsList>

          <TabsContent value="templates"><TemplatesTab /></TabsContent>
          <TabsContent value="bulk"><BulkSendTab /></TabsContent>
          <TabsContent value="ab-testing"><ABTestingTab /></TabsContent>
          <TabsContent value="frequency"><FrequencyCapsTab /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Send, Calendar, Users, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import AppLayout from "@/components/layout/AppLayout";

interface NotificationTemplate {
  id: string;
  name: string;
  type: string;
  content_template: string;
  priority: string;
  variables: string[];
}

export default function BulkNotifications() {
  const { isAdmin, isLoading: authLoading } = useAdminAccess();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [sendImmediately, setSendImmediately] = useState(true);
  const [scheduledFor, setScheduledFor] = useState("");
  const [targetType, setTargetType] = useState<"all" | "criteria" | "specific">("criteria");
  const [criteria, setCriteria] = useState({
    subscription: "",
    has_business: false,
    created_after: "",
    created_before: "",
  });
  const [specificUserIds, setSpecificUserIds] = useState("");
  const [metadata, setMetadata] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const { data: templates } = useQuery({
    queryKey: ['notification-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as NotificationTemplate[];
    },
  });

  const { data: scheduledNotifications } = useQuery({
    queryKey: ['scheduled-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_notifications')
        .select('*, notification_templates(name, type)')
        .order('scheduled_for', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.functions.invoke('send-bulk-notification', {
        body: payload,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-notifications'] });
      toast.success(sendImmediately ? 'Notifications sent successfully' : 'Notification scheduled successfully');
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('scheduled_notifications')
        .update({ status: 'cancelled' })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-notifications'] });
      toast.success('Scheduled notification cancelled');
    },
    onError: (error) => {
      toast.error(`Failed to cancel: ${error.message}`);
    },
  });

  const resetForm = () => {
    setSelectedTemplate("");
    setSendImmediately(true);
    setScheduledFor("");
    setTargetType("criteria");
    setCriteria({
      subscription: "",
      has_business: false,
      created_after: "",
      created_before: "",
    });
    setSpecificUserIds("");
    setMetadata({});
  };

  const handleSend = () => {
    if (!selectedTemplate) {
      toast.error('Please select a template');
      return;
    }

    if (!sendImmediately && !scheduledFor) {
      toast.error('Please select a scheduled time');
      return;
    }

    let payload: any = {
      template_id: selectedTemplate,
      send_immediately: sendImmediately,
      metadata,
    };

    if (!sendImmediately) {
      payload.scheduled_for = scheduledFor;
    }

    if (targetType === "all") {
      payload.target_criteria = {};
    } else if (targetType === "criteria") {
      const filteredCriteria = Object.fromEntries(
        Object.entries(criteria).filter(([_, v]) => v !== "" && v !== false)
      );
      payload.target_criteria = filteredCriteria;
    } else {
      const userIds = specificUserIds.split(',').map(id => id.trim()).filter(Boolean);
      if (userIds.length === 0) {
        toast.error('Please enter at least one user ID');
        return;
      }
      payload.target_user_ids = userIds;
    }

    sendMutation.mutate(payload);
  };

  const selectedTemplateData = templates?.find(t => t.id === selectedTemplate);

  return (
    <div className="container mx-auto p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Bulk Notifications</h1>
        <p className="text-muted-foreground mt-2">Send notifications to multiple users or schedule for later</p>
      </div>

      <Tabs defaultValue="send">
        <TabsList>
          <TabsTrigger value="send">Send / Schedule</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="space-y-6">
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <Label>Select Template</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a notification template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates?.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} ({template.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTemplateData && (
                <div className="p-4 bg-muted rounded-md">
                  <p className="text-sm font-medium mb-2">Template Preview:</p>
                  <code className="text-sm">{selectedTemplateData.content_template}</code>
                  <div className="flex gap-2 mt-3">
                    {selectedTemplateData.variables.map((variable: string) => (
                      <Badge key={variable} variant="secondary" className="text-xs">
                        {"{{"}{variable}{"}}"}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedTemplateData && selectedTemplateData.variables.length > 0 && (
                <div>
                  <Label>Template Variables</Label>
                  <div className="space-y-2 mt-2">
                    {selectedTemplateData.variables.map((variable: string) => (
                      <Input
                        key={variable}
                        placeholder={variable}
                        value={metadata[variable] || ''}
                        onChange={(e) => setMetadata({ ...metadata, [variable]: e.target.value })}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  checked={sendImmediately}
                  onCheckedChange={setSendImmediately}
                />
                <Label>Send Immediately</Label>
              </div>

              {!sendImmediately && (
                <div>
                  <Label>Schedule For</Label>
                  <Input
                    type="datetime-local"
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                  />
                </div>
              )}

              <div>
                <Label>Target Audience</Label>
                <Select value={targetType} onValueChange={(value: any) => setTargetType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="criteria">By Criteria</SelectItem>
                    <SelectItem value="specific">Specific User IDs</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {targetType === "criteria" && (
                <div className="space-y-3 p-4 border rounded-md">
                  <div>
                    <Label>Subscription Tier</Label>
                    <Select 
                      value={criteria.subscription} 
                      onValueChange={(value) => setCriteria({ ...criteria, subscription: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Any tier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Any tier</SelectItem>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="small_business">Small Business</SelectItem>
                        <SelectItem value="organization">Organization</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={criteria.has_business}
                      onCheckedChange={(checked) => setCriteria({ ...criteria, has_business: checked })}
                    />
                    <Label>Has Registered Business</Label>
                  </div>

                  <div>
                    <Label>Created After</Label>
                    <Input
                      type="date"
                      value={criteria.created_after}
                      onChange={(e) => setCriteria({ ...criteria, created_after: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Created Before</Label>
                    <Input
                      type="date"
                      value={criteria.created_before}
                      onChange={(e) => setCriteria({ ...criteria, created_before: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {targetType === "specific" && (
                <div>
                  <Label>User IDs (comma-separated)</Label>
                  <Textarea
                    placeholder="uuid1, uuid2, uuid3..."
                    value={specificUserIds}
                    onChange={(e) => setSpecificUserIds(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetForm}>
                  <X className="w-4 h-4 mr-2" />
                  Reset
                </Button>
                <Button onClick={handleSend} disabled={sendMutation.isPending}>
                  {sendImmediately ? (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Now
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          {scheduledNotifications?.map((notification: any) => (
            <Card key={notification.id} className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{notification.notification_templates?.name}</h3>
                    <Badge variant={
                      notification.status === 'sent' ? 'default' :
                      notification.status === 'failed' ? 'destructive' :
                      notification.status === 'cancelled' ? 'secondary' :
                      'outline'
                    }>
                      {notification.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Scheduled for: {new Date(notification.scheduled_for).toLocaleString()}
                  </p>
                  {notification.sent_count > 0 && (
                    <p className="text-sm">
                      <Users className="w-4 h-4 inline mr-1" />
                      Sent: {notification.sent_count}, Failed: {notification.failed_count}
                    </p>
                  )}
                  {notification.error_message && (
                    <p className="text-sm text-destructive mt-2">{notification.error_message}</p>
                  )}
                </div>
                {notification.status === 'pending' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => cancelMutation.mutate(notification.id)}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                )}
              </div>
            </Card>
          ))}

          {scheduledNotifications?.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground">
              No scheduled notifications
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

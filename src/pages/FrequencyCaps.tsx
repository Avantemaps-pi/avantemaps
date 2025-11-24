import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Edit } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";

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

export default function FrequencyCaps() {
  const [caps, setCaps] = useState<FrequencyCap[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [notificationType, setNotificationType] = useState("");
  const [maxNotifications, setMaxNotifications] = useState(10);
  const [timeWindowMinutes, setTimeWindowMinutes] = useState(60);
  const [priorityThreshold, setPriorityThreshold] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    loadCaps();
  }, []);

  const loadCaps = async () => {
    const { data, error } = await supabase
      .from('notification_frequency_caps')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading frequency caps:', error);
      toast.error('Failed to load frequency caps');
      return;
    }

    setCaps(data || []);
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setNotificationType("");
    setMaxNotifications(10);
    setTimeWindowMinutes(60);
    setPriorityThreshold("");
    setIsActive(true);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!name || maxNotifications <= 0 || timeWindowMinutes <= 0) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);

    try {
      const capData = {
        name,
        description,
        notification_type: notificationType || null,
        max_notifications: maxNotifications,
        time_window_minutes: timeWindowMinutes,
        priority_threshold: priorityThreshold || null,
        is_active: isActive
      };

      if (editingId) {
        const { error } = await supabase
          .from('notification_frequency_caps')
          .update(capData)
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Frequency cap updated');
      } else {
        const { error } = await supabase
          .from('notification_frequency_caps')
          .insert(capData);

        if (error) throw error;
        toast.success('Frequency cap created');
      }

      loadCaps();
      resetForm();
    } catch (error) {
      console.error('Error saving frequency cap:', error);
      toast.error('Failed to save frequency cap');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (cap: FrequencyCap) => {
    setEditingId(cap.id);
    setName(cap.name);
    setDescription(cap.description || "");
    setNotificationType(cap.notification_type || "");
    setMaxNotifications(cap.max_notifications);
    setTimeWindowMinutes(cap.time_window_minutes);
    setPriorityThreshold(cap.priority_threshold || "");
    setIsActive(cap.is_active);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this frequency cap?')) return;

    const { error } = await supabase
      .from('notification_frequency_caps')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting frequency cap:', error);
      toast.error('Failed to delete frequency cap');
      return;
    }

    toast.success('Frequency cap deleted');
    loadCaps();
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    const { error } = await supabase
      .from('notification_frequency_caps')
      .update({ is_active: !currentState })
      .eq('id', id);

    if (error) {
      console.error('Error toggling frequency cap:', error);
      toast.error('Failed to update frequency cap');
      return;
    }

    loadCaps();
  };

  const formatTimeWindow = (minutes: number) => {
    if (minutes < 60) return `${minutes} minutes`;
    if (minutes < 1440) return `${(minutes / 60).toFixed(1)} hours`;
    return `${(minutes / 1440).toFixed(1)} days`;
  };

  return (
    <AppLayout>
      <div className="container max-w-6xl py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Frequency Caps</h1>
          <p className="text-muted-foreground mt-2">
            Limit notification frequency to prevent overwhelming users
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>{editingId ? 'Edit' : 'Create'} Frequency Cap</CardTitle>
                <CardDescription>
                  Set limits on notification frequency
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Daily notification limit"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Limit users to 10 notifications per day"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="notificationType">Notification Type (optional)</Label>
                  <Select value={notificationType} onValueChange={setNotificationType}>
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All types</SelectItem>
                      <SelectItem value="message">Message</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="follower">Follower</SelectItem>
                      <SelectItem value="like">Like</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="maxNotifications">Max Notifications *</Label>
                  <Input
                    id="maxNotifications"
                    type="number"
                    min="1"
                    value={maxNotifications}
                    onChange={(e) => setMaxNotifications(parseInt(e.target.value))}
                  />
                </div>

                <div>
                  <Label htmlFor="timeWindow">Time Window (minutes) *</Label>
                  <Input
                    id="timeWindow"
                    type="number"
                    min="1"
                    value={timeWindowMinutes}
                    onChange={(e) => setTimeWindowMinutes(parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatTimeWindow(timeWindowMinutes)}
                  </p>
                </div>

                <div>
                  <Label htmlFor="priorityThreshold">Priority Threshold (optional)</Label>
                  <Select value={priorityThreshold} onValueChange={setPriorityThreshold}>
                    <SelectTrigger>
                      <SelectValue placeholder="All priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All priorities</SelectItem>
                      <SelectItem value="low">Low and below</SelectItem>
                      <SelectItem value="medium">Medium and below</SelectItem>
                      <SelectItem value="high">High only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="isActive">Active</Label>
                  <Switch
                    id="isActive"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={loading} className="flex-1">
                    <Plus className="h-4 w-4 mr-2" />
                    {editingId ? 'Update' : 'Create'}
                  </Button>
                  {editingId && (
                    <Button variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-semibold">Existing Frequency Caps</h2>
            {caps.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No frequency caps configured yet
                </CardContent>
              </Card>
            ) : (
              caps.map((cap) => (
                <Card key={cap.id} className={!cap.is_active ? 'opacity-60' : ''}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {cap.name}
                          {!cap.is_active && (
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                              Inactive
                            </span>
                          )}
                        </CardTitle>
                        <CardDescription>{cap.description}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Switch
                          checked={cap.is_active}
                          onCheckedChange={() => toggleActive(cap.id, cap.is_active)}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(cap)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(cap.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Type</p>
                        <p className="font-medium">{cap.notification_type || 'All'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Max Notifications</p>
                        <p className="font-medium">{cap.max_notifications}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Time Window</p>
                        <p className="font-medium">{formatTimeWindow(cap.time_window_minutes)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Priority</p>
                        <p className="font-medium">{cap.priority_threshold || 'All'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

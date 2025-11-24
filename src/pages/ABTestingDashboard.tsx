import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Play, Pause, Trophy } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";

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

export default function ABTestingDashboard() {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTest, setSelectedTest] = useState<ABTest | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [testName, setTestName] = useState("");
  const [testDescription, setTestDescription] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [targetSampleSize, setTargetSampleSize] = useState(1000);
  const [variantA, setVariantA] = useState("");
  const [variantB, setVariantB] = useState("");

  useEffect(() => {
    loadTests();
    loadTemplates();
  }, []);

  const loadTests = async () => {
    const { data, error } = await supabase
      .from('notification_ab_tests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading A/B tests:', error);
      toast.error('Failed to load A/B tests');
      return;
    }

    setTests(data || []);
  };

  const loadTemplates = async () => {
    const { data, error } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Error loading templates:', error);
      return;
    }

    setTemplates(data || []);
  };

  const loadVariants = async (testId: string) => {
    const { data, error } = await supabase
      .from('notification_ab_variants')
      .select('*')
      .eq('ab_test_id', testId);

    if (error) {
      console.error('Error loading variants:', error);
      return;
    }

    setVariants(data || []);
  };

  const createTest = async () => {
    if (!testName || !selectedTemplate || !variantA || !variantB) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);

    try {
      // Create test
      const { data: test, error: testError } = await supabase
        .from('notification_ab_tests')
        .insert({
          name: testName,
          description: testDescription,
          template_id: selectedTemplate,
          target_sample_size: targetSampleSize,
          status: 'draft'
        })
        .select()
        .single();

      if (testError) throw testError;

      // Create variants
      const { error: variantsError } = await supabase
        .from('notification_ab_variants')
        .insert([
          {
            ab_test_id: test.id,
            name: 'Variant A',
            content_template: variantA,
            traffic_percentage: 50
          },
          {
            ab_test_id: test.id,
            name: 'Variant B',
            content_template: variantB,
            traffic_percentage: 50
          }
        ]);

      if (variantsError) throw variantsError;

      toast.success('A/B test created successfully');
      loadTests();
      
      // Reset form
      setTestName("");
      setTestDescription("");
      setSelectedTemplate("");
      setVariantA("");
      setVariantB("");
    } catch (error) {
      console.error('Error creating test:', error);
      toast.error('Failed to create A/B test');
    } finally {
      setLoading(false);
    }
  };

  const updateTestStatus = async (testId: string, status: string) => {
    const { error } = await supabase
      .from('notification_ab_tests')
      .update({ 
        status,
        start_date: status === 'running' ? new Date().toISOString() : undefined
      })
      .eq('id', testId);

    if (error) {
      console.error('Error updating test status:', error);
      toast.error('Failed to update test status');
      return;
    }

    toast.success(`Test ${status === 'running' ? 'started' : 'paused'}`);
    loadTests();
  };

  const declareWinner = async (testId: string, variantId: string) => {
    const { error } = await supabase
      .from('notification_ab_tests')
      .update({ 
        status: 'completed',
        winner_variant_id: variantId,
        end_date: new Date().toISOString()
      })
      .eq('id', testId);

    if (error) {
      console.error('Error declaring winner:', error);
      toast.error('Failed to declare winner');
      return;
    }

    toast.success('Winner declared!');
    loadTests();
  };

  const calculateMetrics = (variant: Variant) => {
    const deliveryRate = variant.sent_count > 0 
      ? ((variant.delivered_count / variant.sent_count) * 100).toFixed(1)
      : '0';
    const readRate = variant.delivered_count > 0 
      ? ((variant.read_count / variant.delivered_count) * 100).toFixed(1)
      : '0';
    const clickRate = variant.read_count > 0 
      ? ((variant.clicked_count / variant.read_count) * 100).toFixed(1)
      : '0';

    return { deliveryRate, readRate, clickRate };
  };

  return (
    <AppLayout>
      <div className="container max-w-6xl py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">A/B Testing Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Test different notification templates and optimize engagement
          </p>
        </div>

        <Tabs defaultValue="tests" className="space-y-6">
          <TabsList>
            <TabsTrigger value="tests">Tests</TabsTrigger>
            <TabsTrigger value="create">Create New Test</TabsTrigger>
          </TabsList>

          <TabsContent value="tests" className="space-y-4">
            {tests.map((test) => (
              <Card key={test.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{test.name}</CardTitle>
                      <CardDescription>{test.description}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {test.status === 'draft' && (
                        <Button
                          size="sm"
                          onClick={() => updateTestStatus(test.id, 'running')}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Start Test
                        </Button>
                      )}
                      {test.status === 'running' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateTestStatus(test.id, 'paused')}
                        >
                          <Pause className="h-4 w-4 mr-2" />
                          Pause
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-2 text-sm">
                      <span className={`px-2 py-1 rounded-full ${
                        test.status === 'running' ? 'bg-green-100 text-green-800' :
                        test.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {test.status}
                      </span>
                      <span className="text-muted-foreground">
                        Target: {test.target_sample_size} sends
                      </span>
                    </div>

                    {selectedTest?.id === test.id && variants.length > 0 && (
                      <div className="grid md:grid-cols-2 gap-4 mt-4">
                        {variants.map((variant) => {
                          const { deliveryRate, readRate, clickRate } = calculateMetrics(variant);
                          const isWinner = test.winner_variant_id === variant.id;

                          return (
                            <Card key={variant.id} className={isWinner ? 'border-yellow-500' : ''}>
                              <CardHeader>
                                <CardTitle className="flex items-center justify-between text-lg">
                                  {variant.name}
                                  {isWinner && <Trophy className="h-5 w-5 text-yellow-500" />}
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-3 text-sm">
                                  <div>
                                    <p className="text-muted-foreground">Content</p>
                                    <p className="font-medium line-clamp-2">{variant.content_template}</p>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <p className="text-muted-foreground">Sent</p>
                                      <p className="text-lg font-bold">{variant.sent_count}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Delivered</p>
                                      <p className="text-lg font-bold">{deliveryRate}%</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Read Rate</p>
                                      <p className="text-lg font-bold">{readRate}%</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Click Rate</p>
                                      <p className="text-lg font-bold">{clickRate}%</p>
                                    </div>
                                  </div>
                                  {test.status === 'running' && !test.winner_variant_id && (
                                    <Button
                                      size="sm"
                                      className="w-full"
                                      onClick={() => declareWinner(test.id, variant.id)}
                                    >
                                      Declare Winner
                                    </Button>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}

                    {selectedTest?.id !== test.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTest(test);
                          loadVariants(test.id);
                        }}
                      >
                        View Details
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="create">
            <Card>
              <CardHeader>
                <CardTitle>Create New A/B Test</CardTitle>
                <CardDescription>
                  Test two different versions of your notification to see which performs better
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="testName">Test Name</Label>
                  <Input
                    id="testName"
                    value={testName}
                    onChange={(e) => setTestName(e.target.value)}
                    placeholder="Summer Sale Campaign Test"
                  />
                </div>

                <div>
                  <Label htmlFor="testDescription">Description</Label>
                  <Textarea
                    id="testDescription"
                    value={testDescription}
                    onChange={(e) => setTestDescription(e.target.value)}
                    placeholder="Testing different messaging approaches..."
                  />
                </div>

                <div>
                  <Label htmlFor="template">Base Template</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="sampleSize">Target Sample Size</Label>
                  <Input
                    id="sampleSize"
                    type="number"
                    value={targetSampleSize}
                    onChange={(e) => setTargetSampleSize(parseInt(e.target.value))}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="variantA">Variant A Content</Label>
                    <Textarea
                      id="variantA"
                      value={variantA}
                      onChange={(e) => setVariantA(e.target.value)}
                      placeholder="Don't miss out! {{discount}}% off ends soon!"
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label htmlFor="variantB">Variant B Content</Label>
                    <Textarea
                      id="variantB"
                      value={variantB}
                      onChange={(e) => setVariantB(e.target.value)}
                      placeholder="Save {{discount}}% on your next purchase"
                      rows={4}
                    />
                  </div>
                </div>

                <Button onClick={createTest} disabled={loading} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Create A/B Test
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

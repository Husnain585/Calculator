"use client";

import { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from '@/components/ui/chart';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Scale, Lightbulb, ArrowRightLeft, Copy, History, Info, Dumbbell, Baby, Package, Target, Beef, Apple } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  kilograms: z.coerce.number().min(0, 'Weight cannot be negative'),
});

type FormValues = z.infer<typeof formSchema>;

interface ConversionHistory {
  kilograms: number;
  pounds: number;
  ounces: number;
  timestamp: Date;
}

interface WeightComparison {
  item: string;
  kg: number;
  icon: JSX.Element;
}

const chartConfig = {
  pounds: {
    label: 'Pounds (lb)',
    color: 'hsl(var(--primary))',
  },
  kilograms: {
    label: 'Kilograms (kg)',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function KgToLbCalculator() {
  const [result, setResult] = useState<{
    pounds: number;
    ounces: number;
    stones: number;
    grams: number;
    metricTons: number;
    usTons: number;
  } | null>(null);
  const [history, setHistory] = useState<ConversionHistory[]>([]);
  const [suggestion, setSuggestion] = useState('');
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { kilograms: 0 },
  });

  const kilograms = form.watch('kilograms');

  // Real-time conversion
  useEffect(() => {
    if (kilograms >= 0) {
      calculateConversion({ kilograms });
    }
  }, [kilograms]);

  const getWeightPresets = (): WeightComparison[] => [
    { item: 'Newborn Baby', kg: 3.5, icon: <Baby className="h-4 w-4" /> },
    { item: 'Bag of Sugar', kg: 5, icon: <Package className="h-4 w-4" /> },
    { item: 'Bowling Ball', kg: 7, icon: <Target className="h-4 w-4" /> },
    { item: 'Medium Dog', kg: 15, icon: <Dumbbell className="h-4 w-4" /> },
    { item: 'Adult Male', kg: 80, icon: <Scale className="h-4 w-4" /> },
    { item: 'Adult Female', kg: 65, icon: <Scale className="h-4 w-4" /> },
  ];

  const getCommonWeights = () => [
    { kg: 1, label: '1 kg', description: 'Water bottle' },
    { kg: 5, label: '5 kg', description: 'Small pet' },
    { kg: 10, label: '10 kg', description: 'Toddler' },
    { kg: 25, label: '25 kg', description: 'Luggage limit' },
    { kg: 50, label: '50 kg', description: 'Average teen' },
    { kg: 100, label: '100 kg', description: 'Heavy adult' },
  ];

  const calculateConversion = (data: FormValues) => {
    const kg = data.kilograms;
    const pounds = kg * 2.20462;
    const ounces = kg * 35.274;
    const stones = kg * 0.157473;
    const grams = kg * 1000;
    const metricTons = kg / 1000;
    const usTons = kg * 0.00110231;

    setResult({
      pounds,
      ounces,
      stones,
      grams,
      metricTons,
      usTons,
    });

    // Generate contextual suggestion
    if (kg > 0) {
      generateSuggestion(kg);
    }

    return { pounds, ounces };
  };

  const generateSuggestion = (kg: number) => {
    if (kg < 1) {
      setSuggestion("💡 Tip: For very light items, consider using grams (g) for more precise measurements.");
    } else if (kg >= 1 && kg < 10) {
      setSuggestion("💡 Tip: This weight is common for food items, small pets, or gym weights. In recipes, precision matters!");
    } else if (kg >= 10 && kg < 50) {
      setSuggestion("💡 Tip: This range is typical for children, medium pets, or luggage. Most airline baggage limits are around 23 kg (50 lbs).");
    } else if (kg >= 50 && kg < 100) {
      setSuggestion("💡 Tip: Adult weight range. Remember, healthy weight depends on height, age, and body composition, not just a number!");
    } else if (kg >= 100 && kg < 500) {
      setSuggestion("💡 Tip: This is typical for large furniture, appliances, or livestock. Consider professional moving services for safety.");
    } else {
      setSuggestion("💡 Tip: Very heavy weight! This range is common for vehicles, industrial equipment, or bulk materials.");
    }
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    const { pounds, ounces } = calculateConversion(data);

    // Add to history
    setHistory(prev => [{
      kilograms: data.kilograms,
      pounds,
      ounces,
      timestamp: new Date()
    }, ...prev.slice(0, 9)]);
  };

  const resetCalculator = () => {
    form.reset({ kilograms: 0 });
    setResult(null);
    setSuggestion('');
  };

  const applyWeightPreset = (kg: number) => {
    form.setValue('kilograms', kg);
  };

  const copyToClipboard = () => {
    if (!result) return;
    const text = `${kilograms} kg = ${result.pounds.toFixed(2)} lb = ${result.ounces.toFixed(2)} oz`;
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Conversion result copied to clipboard.',
      duration: 2000,
    });
  };

  const swapConversion = () => {
    // Switch to lb to kg mode (you can implement this as a separate mode)
    if (result) {
      form.setValue('kilograms', result.pounds / 2.20462);
    }
  };

  // Generate comparison chart data
  const generateComparisonData = () => {
    if (!kilograms || kilograms === 0) return [];
    
    const increments = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(multiplier => ({
      label: `${(kilograms * multiplier).toFixed(1)} kg`,
      kg: kilograms * multiplier,
      lb: (kilograms * multiplier * 2.20462),
    }));
    
    return increments;
  };

  const comparisonData = generateComparisonData();

  // Quick reference table data
  const quickReferenceData = [
    { kg: 1, lb: 2.20 },
    { kg: 5, lb: 11.02 },
    { kg: 10, lb: 22.05 },
    { kg: 20, lb: 44.09 },
    { kg: 25, lb: 55.12 },
    { kg: 50, lb: 110.23 },
    { kg: 75, lb: 165.35 },
    { kg: 100, lb: 220.46 },
  ];

  // Weight distribution pie chart
  const weightDistribution = result ? [
    { name: 'Full Pounds', value: Math.floor(result.pounds) },
    { name: 'Fractional Pounds', value: result.pounds - Math.floor(result.pounds) },
  ] : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-6 w-6" />
              Kilograms to Pounds Calculator
            </CardTitle>
            <CardDescription>
              Convert kilograms (kg) to pounds (lb), ounces, stones, and other weight units instantly
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="p-6 space-y-6">
                {/* Common Weight Presets */}
                <div className="space-y-4">
                  <FormLabel className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    Quick Presets
                  </FormLabel>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {getCommonWeights().map((preset, index) => (
                      <Button
                        key={index}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-auto py-2 text-xs"
                        onClick={() => applyWeightPreset(preset.kg)}
                      >
                        <div className="flex flex-col items-center">
                          <span className="font-semibold">{preset.label}</span>
                          <span className="text-xs text-muted-foreground">{preset.description}</span>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Real-world Comparisons */}
                <div className="space-y-4">
                  <FormLabel className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    Real-World Examples
                  </FormLabel>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {getWeightPresets().map((preset, index) => (
                      <Button
                        key={index}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-auto py-2 text-xs"
                        onClick={() => applyWeightPreset(preset.kg)}
                      >
                        <div className="flex items-center gap-1">
                          {preset.icon}
                          <div className="flex flex-col items-start">
                            <span className="text-xs">{preset.item}</span>
                            <span className="text-xs text-muted-foreground">{preset.kg} kg</span>
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Main Input */}
                <div className="grid grid-cols-1 gap-6">
                  <FormField control={form.control} name="kilograms" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-lg">
                        <Scale className="h-5 w-5 text-primary" />
                        Weight in Kilograms (kg)
                      </FormLabel>
                      <FormControl>
                        <div className="space-y-4">
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="Enter weight in kilograms" 
                            className="text-2xl h-16"
                            {...field} 
                          />
                          <Slider
                            min={0}
                            max={200}
                            step={0.5}
                            value={[field.value || 0]}
                            onValueChange={(vals) => field.onChange(vals[0])}
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>0 kg</span>
                            <span>100 kg</span>
                            <span>200 kg</span>
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Live Conversion Preview */}
                {result && kilograms > 0 && (
                  <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Kilograms</p>
                        <p className="text-3xl font-bold text-primary">{kilograms.toFixed(2)} kg</p>
                      </div>
                      <ArrowRightLeft className="h-8 w-8 text-muted-foreground" />
                      <div className="space-y-1 text-right">
                        <p className="text-sm text-muted-foreground">Pounds</p>
                        <p className="text-3xl font-bold text-primary">{result.pounds.toFixed(2)} lb</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Ounces</p>
                        <p className="text-lg font-semibold">{result.ounces.toFixed(2)} oz</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Stones</p>
                        <p className="text-lg font-semibold">{result.stones.toFixed(2)} st</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Grams</p>
                        <p className="text-lg font-semibold">{result.grams.toFixed(0)} g</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Metric Tons</p>
                        <p className="text-lg font-semibold">{result.metricTons.toFixed(4)} t</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex gap-4">
                <Button type="button" variant="outline" onClick={resetCalculator}>
                  Reset
                </Button>
                <Button type="submit" className="flex-1">
                  <Scale className="mr-2 h-4 w-4" />
                  Convert Weight
                </Button>
                {result && (
                  <Button type="button" variant="outline" onClick={copyToClipboard}>
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </CardFooter>
            </form>
          </Form>
        </Card>

        {/* Conversion History */}
        {history.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Conversion History
              </CardTitle>
              <CardDescription>
                Recent weight conversions (last 10)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {history.slice(0, 5).map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary">{item.kilograms.toFixed(2)} kg</span>
                        <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                        <span className="font-bold">{item.pounds.toFixed(2)} lb</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => form.setValue('kilograms', item.kilograms)}
                    >
                      Use
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comparison Chart */}
        {comparisonData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Weight Comparison Chart</CardTitle>
              <CardDescription>
                Visual comparison of kg to lb conversions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-54">
                <ChartContainer config={chartConfig}>
                  <BarChart data={comparisonData}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="kg" fill="var(--color-kilograms)" name="Kilograms" />
                    <Bar dataKey="lb" fill="var(--color-pounds)" name="Pounds" />
                  </BarChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Reference Table */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Reference Table</CardTitle>
            <CardDescription>
              Common kg to lb conversions for quick lookup
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {quickReferenceData.map((data, index) => (
                <div 
                  key={index} 
                  className="border rounded-lg p-4 text-center hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => form.setValue('kilograms', data.kg)}
                >
                  <p className="text-sm text-muted-foreground">Kilograms</p>
                  <p className="text-xl font-bold text-primary">{data.kg}</p>
                  <div className="my-2 border-t"></div>
                  <p className="text-sm text-muted-foreground">Pounds</p>
                  <p className="text-xl font-bold">{data.lb}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Detailed Conversion Table */}
        <Card>
          <CardHeader>
            <CardTitle>Detailed Conversion Table</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="incremental" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="incremental">Incremental (1-10 kg)</TabsTrigger>
                <TabsTrigger value="common">Common Weights</TabsTrigger>
              </TabsList>
              
              <TabsContent value="incremental">
                <div className="max-h-96 overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead>Kilograms (kg)</TableHead>
                        <TableHead>Pounds (lb)</TableHead>
                        <TableHead>Ounces (oz)</TableHead>
                        <TableHead>Stones (st)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from({ length: 100 }, (_, i) => i + 1).map((kg) => (
                        <TableRow key={kg} className="hover:bg-muted/50">
                          <TableCell className="font-medium">{kg} kg</TableCell>
                          <TableCell>{(kg * 2.20462).toFixed(2)} lb</TableCell>
                          <TableCell>{(kg * 35.274).toFixed(2)} oz</TableCell>
                          <TableCell>{(kg * 0.157473).toFixed(2)} st</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="common">
                <div className="max-h-96 overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Kilograms (kg)</TableHead>
                        <TableHead>Pounds (lb)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { desc: 'Smartphone', kg: 0.2 },
                        { desc: 'Laptop', kg: 2 },
                        { desc: 'Newborn baby', kg: 3.5 },
                        { desc: 'Bag of flour', kg: 5 },
                        { desc: 'House cat', kg: 4.5 },
                        { desc: 'Bowling ball', kg: 7 },
                        { desc: 'Small dog', kg: 10 },
                        { desc: 'Toddler', kg: 12 },
                        { desc: 'Medium dog', kg: 20 },
                        { desc: 'Airline baggage limit', kg: 23 },
                        { desc: '5-year-old child', kg: 18 },
                        { desc: 'Large dog', kg: 35 },
                        { desc: 'Adult female (avg)', kg: 65 },
                        { desc: 'Adult male (avg)', kg: 80 },
                        { desc: 'Washing machine', kg: 70 },
                        { desc: 'Refrigerator', kg: 90 },
                      ].map((item, index) => (
                        <TableRow 
                          key={index} 
                          className="hover:bg-muted/50 cursor-pointer"
                          onClick={() => form.setValue('kilograms', item.kg)}
                        >
                          <TableCell className="font-medium">{item.desc}</TableCell>
                          <TableCell>{item.kg} kg</TableCell>
                          <TableCell>{(item.kg * 2.20462).toFixed(2)} lb</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Results Panel */}
      <div>
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle>Conversion Results</CardTitle>
          </CardHeader>
          <CardContent className="text-center p-6 space-y-6">
            {result && kilograms > 0 ? (
              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-primary/5">
                  <p className="text-sm text-muted-foreground">Primary Result</p>
                  <p className="text-4xl font-bold text-primary my-2">{result.pounds.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">Pounds (lb)</p>
                </div>
                
                <div className="pt-4 border-t space-y-3">
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Ounces</span>
                    <span className="font-bold text-lg">{result.ounces.toFixed(2)} oz</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Stones</span>
                    <span className="font-bold text-lg">{result.stones.toFixed(2)} st</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Grams</span>
                    <span className="font-bold text-lg">{result.grams.toFixed(0)} g</span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">US Tons</span>
                    <span className="font-bold text-lg">{result.usTons.toFixed(4)} t</span>
                  </div>
                </div>

                {/* Conversion Formula */}
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Conversion Formula</p>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="font-mono text-sm">
                      {kilograms} kg × 2.20462 = {result.pounds.toFixed(2)} lb
                    </p>
                  </div>
                </div>

                {/* Weight Insights */}
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    <p className="text-sm font-medium">Weight Context</p>
                  </div>
                  <div className="text-sm text-muted-foreground text-left space-y-1">
                    <p>• In ounces: {result.ounces.toFixed(2)} oz</p>
                    <p>• In stones: {result.stones.toFixed(2)} st (UK)</p>
                    <p>• In grams: {result.grams.toLocaleString()} g</p>
                    <p>• Metric tons: {result.metricTons.toFixed(6)} t</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={copyToClipboard}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={swapConversion}
                  >
                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                    Swap
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Scale className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Enter a weight in kilograms to see the conversion results and detailed breakdown.
                </p>
              </div>
            )}
             
            {suggestion && (
              <div className="pt-6 border-t">
                <CardHeader className="p-0 mb-2 flex-row items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Smart Tip</CardTitle>
                </CardHeader>
                <CardDescription className="text-left">
                  {suggestion}
                </CardDescription>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Educational Content */}
      <div className="lg:col-span-3 mt-8">
        <Tabs defaultValue="guide" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="guide">Conversion Guide</TabsTrigger>
            <TabsTrigger value="formulas">Formulas</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="faq">FAQ</TabsTrigger>
          </TabsList>
          
          <TabsContent value="guide">
            <Accordion type="single" collapsible>
              <AccordionItem value="what-is">
                <AccordionTrigger>What is the difference between kg and lb?</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <p>
                      Kilograms (kg) and pounds (lb) are both units of weight/mass, but they belong to different measurement systems:
                    </p>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Badge>Metric System</Badge>
                          Kilogram (kg)
                        </h4>
                        <div className="text-sm space-y-2">
                          <p>• Used worldwide in most countries</p>
                          <p>• Part of the International System (SI)</p>
                          <p>• Based on decimal system (easy to convert)</p>
                          <p>• 1 kg = 1000 grams</p>
                          <p>• Standard scientific measurement</p>
                        </div>
                      </div>
                      
                      <div className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Badge>Imperial System</Badge>
                          Pound (lb)
                        </h4>
                        <div className="text-sm space-y-2">
                          <p>• Primarily used in the United States</p>
                          <p>• Part of the Imperial/US customary system</p>
                          <p>• Historical measurement system</p>
                          <p>• 1 lb = 16 ounces</p>
                          <p>• Common in US commerce and daily life</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <h4 className="font-semibold mb-2">Key Conversion</h4>
                      <p className="text-lg font-mono">1 kilogram = 2.20462 pounds</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        This means 1 kg is slightly more than 2 pounds. A person weighing 70 kg weighs about 154 pounds.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="when-to-use">
                <AccordionTrigger>When should I use kg vs lb?</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-3 text-green-600">Use Kilograms (kg) for:</h4>
                        <div className="text-sm space-y-2">
                          <p>✓ International travel and shipping</p>
                          <p>✓ Scientific and medical contexts</p>
                          <p>✓ European, Asian, and most world markets</p>
                          <p>✓ Olympic sports and athletics</p>
                          <p>✓ Nutrition labels in most countries</p>
                          <p>✓ Metric recipe measurements</p>
                          <p>✓ Pharmaceutical dosages</p>
                        </div>
                      </div>
                      
                      <div className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-3 text-blue-600">Use Pounds (lb) for:</h4>
                        <div className="text-sm space-y-2">
                          <p>✓ United States domestic commerce</p>
                          <p>✓ US food and grocery shopping</p>
                          <p>✓ American fitness and bodybuilding</p>
                          <p>✓ US medical records (sometimes)</p>
                          <p>✓ American recipes and cooking</p>
                          <p>✓ US-based sports (boxing, wrestling)</p>
                          <p>✓ Personal weight tracking in US</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                      <h4 className="font-semibold mb-2">💡 Pro Tip</h4>
                      <p className="text-sm">
                        If you're traveling internationally or working in science/medicine, familiarize yourself with kg. 
                        If you're in the US, knowing both systems is helpful for international communication and online shopping.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="common-conversions">
                <AccordionTrigger>What are the most common weight conversions?</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Baby className="h-4 w-4" />
                          Babies & Children
                        </h4>
                        <div className="text-sm space-y-2">
                          <p>• Newborn: 2.5-4 kg (5.5-8.8 lb)</p>
                          <p>• 6 months: 7-8 kg (15-18 lb)</p>
                          <p>• 1 year: 9-10 kg (20-22 lb)</p>
                          <p>• 5 years: 18-20 kg (40-44 lb)</p>
                          <p>• 10 years: 30-35 kg (66-77 lb)</p>
                        </div>
                      </div>
                      
                      <div className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Scale className="h-4 w-4" />
                          Adults
                        </h4>
                        <div className="text-sm space-y-2">
                          <p>• Light adult: 50-60 kg (110-132 lb)</p>
                          <p>• Average female: 60-70 kg (132-154 lb)</p>
                          <p>• Average male: 70-85 kg (154-187 lb)</p>
                          <p>• Heavy adult: 90-100 kg (198-220 lb)</p>
                          <p>• Very heavy: 100+ kg (220+ lb)</p>
                        </div>
                      </div>

                      <div className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Objects & Items
                        </h4>
                        <div className="text-sm space-y-2">
                          <p>• Smartphone: 0.15-0.25 kg (0.3-0.5 lb)</p>
                          <p>• Laptop: 1.5-3 kg (3.3-6.6 lb)</p>
                          <p>• Suitcase limit: 23 kg (50 lb)</p>
                          <p>• Washing machine: 60-80 kg (132-176 lb)</p>
                          <p>• Small car: 1000-1500 kg (2204-3307 lb)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          <TabsContent value="formulas">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Scale className="h-5 w-5 text-blue-500" />
                  <h3 className="font-semibold">Conversion Formulas & Math</h3>
                </div>
                <div className="space-y-4 text-sm">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Kilograms to Pounds</h4>
                    <div className="font-mono bg-muted p-3 rounded-md text-xs mb-2">
                      pounds = kilograms × 2.20462
                    </div>
                    <p className="text-muted-foreground mb-2">
                      Example: 70 kg × 2.20462 = 154.32 lb
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Quick approximation: multiply by 2.2 for mental math
                    </p>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Pounds to Kilograms</h4>
                    <div className="font-mono bg-muted p-3 rounded-md text-xs mb-2">
                      kilograms = pounds ÷ 2.20462<br />
                      OR<br />
                      kilograms = pounds × 0.453592
                    </div>
                    <p className="text-muted-foreground mb-2">
                      Example: 150 lb ÷ 2.20462 = 68.04 kg
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Quick approximation: divide by 2.2 for mental math
                    </p>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Other Common Conversions</h4>
                    <div className="space-y-2 text-xs">
                      <p className="font-mono bg-muted p-2 rounded">1 kg = 1,000 grams (g)</p>
                      <p className="font-mono bg-muted p-2 rounded">1 kg = 35.274 ounces (oz)</p>
                      <p className="font-mono bg-muted p-2 rounded">1 kg = 0.157 stones (st)</p>
                      <p className="font-mono bg-muted p-2 rounded">1 kg = 0.001 metric tons (t)</p>
                      <p className="font-mono bg-muted p-2 rounded">1 kg = 0.00110231 US tons</p>
                    </div>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      <h4 className="font-semibold">Mental Math Tricks</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p>• <strong>kg to lb:</strong> Double it, then add 10% (70 kg → 140 + 14 = 154 lb)</p>
                      <p>• <strong>lb to kg:</strong> Halve it, then subtract 10% (150 lb → 75 - 7.5 = 67.5 kg)</p>
                      <p>• <strong>Quick check:</strong> 1 kg is roughly 2.2 lb, so 10 kg ≈ 22 lb</p>
                      <p>• <strong>Body weight:</strong> Most adults are 50-100 kg (110-220 lb)</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">History of Weight Measurement Systems</h3>
                <div className="space-y-4 text-sm">
                  <div className="border-l-4 border-primary pl-4">
                    <h4 className="font-semibold mb-1">The Metric System (Kilogram)</h4>
                    <p className="text-muted-foreground">
                      The kilogram was established in 1795 during the French Revolution as part of the metric system. 
                      Originally defined as the mass of one liter of water, it was later refined and became the base 
                      unit of mass in the International System of Units (SI) in 1960.
                    </p>
                    <p className="text-muted-foreground mt-2">
                      In 2019, the kilogram was redefined based on fundamental physical constants (Planck constant) 
                      rather than a physical prototype, making it more stable and universal.
                    </p>
                  </div>

                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-semibold mb-1">The Imperial System (Pound)</h4>
                    <p className="text-muted-foreground">
                      The pound has ancient origins, dating back to Roman times. The word "pound" comes from the 
                      Latin "libra pondo" (hence the abbreviation "lb"). The modern pound was standardized in 1959 
                      as exactly 0.45359237 kilograms through an international agreement.
                    </p>
                    <p className="text-muted-foreground mt-2">
                      While most of the world uses kilograms, the United States continues to use pounds for most 
                      everyday applications, making it important to know both systems.
                    </p>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Timeline</h4>
                    <div className="space-y-2 text-xs">
                      <p><strong>Ancient Rome:</strong> Pound concept originates</p>
                      <p><strong>1795:</strong> Kilogram introduced in France</p>
                      <p><strong>1889:</strong> International Prototype Kilogram created</p>
                      <p><strong>1959:</strong> Pound officially defined as 0.453592 kg</p>
                      <p><strong>1960:</strong> Kilogram becomes SI base unit</p>
                      <p><strong>2019:</strong> Kilogram redefined using Planck constant</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="faq">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Frequently Asked Questions</h3>
                <Accordion type="single" collapsible>
                  <AccordionItem value="faq-1">
                    <AccordionTrigger>Why does the US use pounds instead of kilograms?</AccordionTrigger>
                    <AccordionContent>
                      The United States continues to use the imperial system (including pounds) primarily due to historical 
                      reasons and the massive cost of converting infrastructure, education, and industry. While the US 
                      officially adopted the metric system in 1975, its use remains optional, and cultural inertia keeps 
                      pounds dominant in everyday life.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="faq-2">
                    <AccordionTrigger>Is it better to lose weight in kg or lb?</AccordionTrigger>
                    <AccordionContent>
                      Neither is "better" - it's personal preference and regional custom. Some people prefer kilograms 
                      because smaller numbers feel more manageable (losing 5 kg vs 11 lb sounds less daunting). Others 
                      prefer pounds because the larger numbers show more dramatic progress. What matters is tracking 
                      consistently with one system.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="faq-3">
                    <AccordionTrigger>How accurate is the 2.2 conversion factor?</AccordionTrigger>
                    <AccordionContent>
                      The exact conversion is 1 kg = 2.20462 pounds. Using 2.2 is accurate enough for most everyday 
                      purposes (within 0.21% error). For example, converting 70 kg: exact = 154.32 lb, approximation = 
                      154 lb. For scientific or medical applications, use the full 2.20462 factor.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="faq-4">
                    <AccordionTrigger>What's the difference between mass and weight?</AccordionTrigger>
                    <AccordionContent>
                      Mass (measured in kg) is the amount of matter in an object and doesn't change. Weight is the force 
                      of gravity on that mass and varies by location (less on the Moon, more on Jupiter). In everyday 
                      usage, we often use "weight" to mean mass. Both kg and lb technically measure mass, though lb is 
                      sometimes called a unit of "weight."
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="faq-5">
                    <AccordionTrigger>Why is the pound abbreviated as "lb"?</AccordionTrigger>
                    <AccordionContent>
                      "lb" comes from the Latin phrase "libra pondo," meaning "a pound weight." The Romans used the 
                      libra (balance scale) as their basic unit of mass. This is why we still use "lb" even though it 
                      doesn't match the English word "pound."
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="faq-6">
                    <AccordionTrigger>What are stones and why do British people use them?</AccordionTrigger>
                    <AccordionContent>
                      A stone is an old British unit equal to 14 pounds or approximately 6.35 kg. It's still commonly 
                      used in the UK and Ireland for measuring body weight. For example, someone might say they weigh 
                      "11 stone 5" meaning 11 stones and 5 pounds (159 pounds or 72 kg total). It's purely a cultural 
                      convention.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
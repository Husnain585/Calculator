"use client";

import { useState } from 'react';
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
import { Calculator as CalculatorIcon, Lightbulb, Users, HandCoins, DollarSign, Percent, Sparkles, Copy, History, Info } from 'lucide-react';
import { suggestNextStep } from '@/ai/flows/suggest-next-step';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  bill: z.coerce.number().positive('Bill amount must be positive.'),
  tipPercent: z.number().min(0).max(100),
  people: z.coerce.number().int().min(1, 'Must be at least 1 person.'),
});

type FormValues = z.infer<typeof formSchema>;

interface Result {
  tipAmount: number;
  totalAmount: number;
  perPersonAmount: number;
  timestamp: Date;
}

export default function TipCalculator() {
  const [result, setResult] = useState<Result | null>(null);
  const [suggestion, setSuggestion] = useState('');
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [history, setHistory] = useState<Result[]>([]);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bill: undefined,
      tipPercent: 18,
      people: 1,
    },
  });

  const bill = form.watch('bill');
  const tipPercentage = form.watch('tipPercent');
  const people = form.watch('people');

  const getPresetTips = () => [
    { percent: 15, label: 'Standard', emoji: '👍' },
    { percent: 18, label: 'Good', emoji: '😊' },
    { percent: 20, label: 'Great', emoji: '⭐' },
    { percent: 22, label: 'Excellent', emoji: '🎉' },
    { percent: 25, label: 'Outstanding', emoji: '🔥' },
    { percent: 10, label: 'Basic', emoji: '👌' },
  ];

  const getCommonBills = () => [
    { amount: 25, label: '$25' },
    { amount: 50, label: '$50' },
    { amount: 75, label: '$75' },
    { amount: 100, label: '$100' },
    { amount: 150, label: '$150' },
    { amount: 200, label: '$200' },
  ];

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    const { bill, tipPercent, people } = data;
    const tipAmount = bill * (tipPercent / 100);
    const totalAmount = bill + tipAmount;
    const perPersonAmount = totalAmount / people;

    const newResult = { tipAmount, totalAmount, perPersonAmount, timestamp: new Date() };
    setResult(newResult);
    
    // Add to history
    setHistory(prev => [newResult, ...prev.slice(0, 9)]);

    setSuggestionLoading(true);
    setSuggestion('');
    try {
      const res = await suggestNextStep({ 
        calculatorName: 'Tip Calculator',
        billAmount: bill,
        tipPercent: tipPercent,
        people: people
      });
      setSuggestion(res.suggestion);
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
      setSuggestion("Tipping customs vary by country. When traveling, it's always a good idea to check local etiquette!");
    } finally {
      setSuggestionLoading(false);
    }
  };

  const resetCalculator = () => {
    form.reset({
      bill: undefined,
      tipPercent: 18,
      people: 1,
    });
    setResult(null);
    setSuggestion('');
    setSuggestionLoading(false);
  };

  const applyPresetTip = (percent: number) => {
    form.setValue('tipPercent', percent);
  };

  const applyCommonBill = (amount: number) => {
    form.setValue('bill', amount);
  };

  const copyToClipboard = () => {
    if (!result) return;
    const text = `Total: $${result.totalAmount.toFixed(2)} | Tip: $${result.tipAmount.toFixed(2)} | Per Person: $${result.perPersonAmount.toFixed(2)}`;
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Tip calculation copied to clipboard.',
      duration: 2000,
    });
  };

  const recalculate = () => {
    const currentValues = form.getValues();
    if (currentValues.bill) {
      onSubmit(currentValues);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Tip Calculator</CardTitle>
            <CardDescription>
              Calculate tips and split bills with customizable percentages
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="p-6 space-y-6">
                {/* Quick Bill Presets */}
                <div className="space-y-4">
                  <FormLabel className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                    Common Bill Amounts
                  </FormLabel>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {getCommonBills().map((bill, index) => (
                      <Button
                        key={index}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-auto py-2 text-xs"
                        onClick={() => applyCommonBill(bill.amount)}
                      >
                        {bill.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Bill Amount Input */}
                <FormField
                  control={form.control}
                  name="bill"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        Bill Amount ($)
                      </FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="e.g., 54.95" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tip Percentage with Presets */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <FormLabel className="flex items-center gap-2">
                      <Percent className="h-4 w-4 text-muted-foreground" />
                      Tip Percentage
                    </FormLabel>
                    <span className="text-lg font-bold text-primary">{tipPercentage}%</span>
                  </div>
                  
                  {/* Quick Tip Presets */}
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {getPresetTips().map((preset, index) => (
                      <Button
                        key={index}
                        type="button"
                        variant={tipPercentage === preset.percent ? "default" : "outline"}
                        size="sm"
                        className="h-auto py-2 text-xs"
                        onClick={() => applyPresetTip(preset.percent)}
                      >
                        <div className="flex items-center gap-1">
                          <span>{preset.emoji}</span>
                          <span>{preset.percent}%</span>
                        </div>
                      </Button>
                    ))}
                  </div>

                  {/* Tip Slider */}
                  <FormField
                    control={form.control}
                    name="tipPercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Slider
                            min={0}
                            max={50}
                            step={1}
                            value={[field.value]}
                            onValueChange={(vals) => field.onChange(vals[0])}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* People Input */}
                <FormField
                  control={form.control}
                  name="people"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        Split Between
                      </FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <Input type="number" placeholder="e.g., 2" {...field} />
                          <Slider
                            min={1}
                            max={20}
                            step={1}
                            value={[field.value]}
                            onValueChange={(vals) => field.onChange(vals[0])}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Quick Calculation Preview */}
                {bill && bill > 0 && (
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Tip Amount:</span>
                      <span className="font-semibold">${(bill * (tipPercentage / 100)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total Amount:</span>
                      <span className="font-semibold">${(bill + (bill * (tipPercentage / 100))).toFixed(2)}</span>
                    </div>
                    {people > 1 && (
                      <div className="flex justify-between text-sm">
                        <span>Per Person:</span>
                        <span className="font-semibold">${((bill + (bill * (tipPercentage / 100))) / people).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex gap-4">
                <Button type="button" variant="outline" onClick={resetCalculator}>
                  Reset
                </Button>
                <Button type="submit" className="flex-1" disabled={!bill || bill <= 0}>
                  <CalculatorIcon className="mr-2 h-4 w-4" />
                  Calculate Tip
                </Button>
                {result && (
                  <Button type="button" variant="outline" onClick={recalculate}>
                    <CalculatorIcon className="h-4 w-4" />
                  </Button>
                )}
              </CardFooter>
            </form>
          </Form>
        </Card>

        {/* History */}
        {history.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Calculation History
              </CardTitle>
              <CardDescription>
                Recent tip calculations (last 10)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {history.slice(0, 5).map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary">${item.totalAmount.toFixed(2)}</span>
                        <Badge variant="outline" className="text-xs">
                          ${item.tipAmount.toFixed(2)} tip
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">${item.perPersonAmount.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">per person</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Results Panel */}
      <div>
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle>Your Split</CardTitle>
          </CardHeader>
          <CardContent className="text-center p-6 space-y-6">
            {result ? (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Amount Per Person</p>
                    <p className="text-3xl font-bold text-primary">${result.perPersonAmount.toFixed(2)}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 border rounded-lg">
                      <p className="text-muted-foreground">Total Tip</p>
                      <p className="font-semibold">${result.tipAmount.toFixed(2)}</p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <p className="text-muted-foreground">Total Bill</p>
                      <p className="font-semibold">${result.totalAmount.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    <p className="text-sm font-medium">Calculation Details</p>
                  </div>
                  <div className="text-sm text-muted-foreground text-left space-y-1">
                    <p>• Tip Rate: {tipPercentage}%</p>
                    <p>• Original Bill: ${bill?.toFixed(2)}</p>
                    <p>• People Sharing: {people}</p>
                    <p>• Tip/Person: ${(result.tipAmount / people).toFixed(2)}</p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={copyToClipboard}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Calculation
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <HandCoins className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Enter your bill details to calculate the tip and split.
                </p>
              </div>
            )}
             
            {(suggestion || suggestionLoading) && (
              <div className="pt-6 border-t">
                <CardHeader className="p-0 mb-2 flex-row items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Tipping Tip</CardTitle>
                </CardHeader>
                <CardDescription>
                  {suggestionLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  ) : (
                    suggestion
                  )}
                </CardDescription>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Educational Content */}
      <div className="lg:col-span-3 mt-8">
        <Tabs defaultValue="guide" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="guide">Usage Guide</TabsTrigger>
            <TabsTrigger value="etiquette">Tipping Etiquette</TabsTrigger>
            <TabsTrigger value="formulas">Calculation Methods</TabsTrigger>
          </TabsList>
          
          <TabsContent value="guide">
            <Accordion type="single" collapsible>
              <AccordionItem value="explanation">
                <AccordionTrigger>How is the tip calculated?</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <p>
                      The tip is calculated as a percentage of the original bill amount. The total amount includes both the original bill and the calculated tip, which is then divided by the number of people sharing the cost.
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Tip Calculation Formula</h4>
                        <div className="font-mono bg-muted p-4 rounded-md text-sm">
                          Tip Amount = Bill × (Tip Percentage ÷ 100)
                        </div>
                      </div>
                      
                      <div className="font-mono bg-muted p-4 rounded-md text-sm">
                        Total Amount = Bill + Tip Amount
                      </div>
                      
                      <div className="font-mono bg-muted p-4 rounded-md text-sm">
                        Per Person = Total Amount ÷ Number of People
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold mb-2">Common Tip Percentages</h4>
                          <div className="text-sm space-y-2">
                            <p><strong>15%:</strong> Standard service</p>
                            <p><strong>18%:</strong> Good service</p>
                            <p><strong>20%:</strong> Great service</p>
                            <p><strong>22%+:</strong> Exceptional service</p>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-2">Quick Math</h4>
                          <div className="text-sm space-y-2">
                            <p>• 10%: Move decimal left once</p>
                            <p>• 15%: 10% + half of 10%</p>
                            <p>• 20%: Move decimal left & double</p>
                            <p>• 25%: Half, then half again</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          <TabsContent value="etiquette">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Tipping Etiquette Guide</h3>
                <div className="space-y-4">
                  {[
                    {
                      category: "Restaurants",
                      recommendation: "15-20% of pre-tax bill",
                      details: "Based on service quality. Higher for exceptional service, lower for poor service.",
                      notes: "Some restaurants include service charge"
                    },
                    {
                      category: "Food Delivery",
                      recommendation: "15-20% or $5 minimum",
                      details: "Consider distance, weather, and order size",
                      notes: "Additional fee for delivery apps"
                    },
                    {
                      category: "Bars",
                      recommendation: "$1-2 per drink or 15-20%",
                      details: "Per drink for simple orders, percentage for complex tabs",
                      notes: "Tip when served, not when paying"
                    },
                    {
                      category: "Takeout",
                      recommendation: "10% or $1-2",
                      details: "For counter service and pickup orders",
                      notes: "Optional but appreciated"
                    },
                    {
                      category: "Rideshare/Taxi",
                      recommendation: "15-20% of fare",
                      details: "Round up or percentage for longer rides",
                      notes: "Help with luggage deserves extra"
                    }
                  ].map((item, index) => (
                    <div key={index} className="flex items-start gap-4 py-3 border-b">
                      <Badge variant="outline" className="whitespace-nowrap border-green-200 bg-green-50">
                        {item.category}
                      </Badge>
                      <div className="flex-1">
                        <p className="font-medium">{item.recommendation}</p>
                        <p className="text-sm text-muted-foreground mt-1">{item.details}</p>
                        <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="formulas">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CalculatorIcon className="h-5 w-5 text-green-500" />
                  <h3 className="font-semibold">Calculation Methods</h3>
                </div>
                <div className="space-y-4 text-sm">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Percentage Method (Most Common)</h4>
                    <p className="text-muted-foreground">
                      Calculate tip as a percentage of the bill. This is the standard method used in most restaurants and services.
                    </p>
                    <div className="font-mono bg-muted p-3 rounded-md mt-2 text-xs">
                      Tip = Bill × (Percentage ÷ 100)
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Per Person Split</h4>
                    <p className="text-muted-foreground">
                      Divide the total bill (including tip) equally among all people. This ensures everyone pays their fair share.
                    </p>
                    <div className="font-mono bg-muted p-3 rounded-md mt-2 text-xs">
                      Each Pays = (Bill + Tip) ÷ Number of People
                    </div>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="h-4 w-4 text-blue-500" />
                      <h4 className="font-semibold">Quick Calculation Tips</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p>• <strong>10%:</strong> Move decimal one place left ($50 → $5)</p>
                      <p>• <strong>15%:</strong> 10% + half of 10% ($50 → $5 + $2.50 = $7.50)</p>
                      <p>• <strong>20%:</strong> Double 10% ($50 → $5 × 2 = $10)</p>
                      <p>• <strong>25%:</strong> Half of half ($50 → $25 → $12.50)</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
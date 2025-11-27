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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calculator as CalculatorIcon, Lightbulb, Percent, TrendingUp, TrendingDown, Target, AlertTriangle, Info, Sparkles } from 'lucide-react';
import { suggestNextStep } from '@/ai/flows/suggest-next-step';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';

const formSchema = z.object({
    calculationType: z.string(),
    value1: z.coerce.number(),
    value2: z.coerce.number(),
});

type FormValues = z.infer<typeof formSchema>;

interface Result {
  text: string;
  value: string;
  numericValue: number;
  changeType?: 'increase' | 'decrease' | 'no-change';
}

export default function PercentageCalculator() {
  const [result, setResult] = useState<Result | null>(null);
  const [suggestion, setSuggestion] = useState('');
  const [suggestionLoading, setSuggestionLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      calculationType: 'percentOf',
      value1: undefined,
      value2: undefined,
    },
  });

  const calculationType = form.watch('calculationType');

  const getCalculationExamples = () => {
    const examples = {
      'percentOf': [
        { value1: 20, value2: 100, label: '20% of 100' },
        { value1: 15, value2: 200, label: '15% tip on $200' },
        { value1: 30, value2: 50, label: '30% discount on $50' },
      ],
      'isWhatPercentOf': [
        { value1: 25, value2: 100, label: '25 of 100' },
        { value1: 75, value2: 150, label: '75 of 150' },
        { value1: 40, value2: 80, label: '40 of 80' },
      ],
      'percentChange': [
        { value1: 50, value2: 75, label: '50 to 75' },
        { value1: 100, value2: 80, label: '100 to 80' },
        { value1: 200, value2: 250, label: '200 to 250' },
      ],
    };
    return examples[calculationType as keyof typeof examples] || [];
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    const { calculationType, value1, value2 } = data;
    let calcResult: Result | null = null;

    switch (calculationType) {
        case 'percentOf':
            const percentOfResult = (value1 / 100) * value2;
            calcResult = { 
              text: `${value1}% of ${value2.toLocaleString()} is`, 
              value: percentOfResult.toLocaleString(undefined, { maximumFractionDigits: 2 }),
              numericValue: percentOfResult
            };
            break;
        case 'isWhatPercentOf':
            if (value2 === 0) {
                form.setError('value2', { message: 'Cannot be zero.'});
                return;
            }
            const isWhatPercentOfResult = (value1 / value2) * 100;
            calcResult = { 
              text: `${value1.toLocaleString()} is what percent of ${value2.toLocaleString()}?`, 
              value: `${isWhatPercentOfResult.toFixed(2)}%`,
              numericValue: isWhatPercentOfResult
            };
            break;
        case 'percentChange':
             if (value1 === 0) {
                form.setError('value1', { message: 'Cannot be zero for percentage change.'});
                return;
            }
            const changeResult = ((value2 - value1) / value1) * 100;
            const changeType = changeResult > 0 ? 'increase' : changeResult < 0 ? 'decrease' : 'no-change';
            calcResult = { 
              text: `From ${value1.toLocaleString()} to ${value2.toLocaleString()} is a`, 
              value: `${Math.abs(changeResult).toFixed(2)}% ${changeType}`,
              numericValue: changeResult,
              changeType
            };
            break;
    }

    setResult(calcResult);

    setSuggestionLoading(true);
    setSuggestion('');
    try {
      const res = await suggestNextStep({ 
        calculatorName: 'Percentage Calculator',
        calculationType,
        numericValue: calcResult?.numericValue
      });
      setSuggestion(res.suggestion);
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
      setSuggestion("Percentages are everywhere! Try using this for calculating tips, store discounts, or tracking your own goals and progress.");
    } finally {
      setSuggestionLoading(false);
    }
  };

  const resetCalculator = () => {
    form.reset({
      calculationType: 'percentOf',
      value1: undefined,
      value2: undefined,
    });
    setResult(null);
    setSuggestion('');
    setSuggestionLoading(false);
  };
  
  const getLabels = () => {
    switch (calculationType) {
        case 'percentOf':
            return { 
              label1: 'Percentage (%)', 
              label2: 'Base Number',
              icon1: <Percent className="h-4 w-4 text-muted-foreground" />,
              icon2: <Target className="h-4 w-4 text-muted-foreground" />
            };
        case 'isWhatPercentOf':
            return { 
              label1: 'Partial Value', 
              label2: 'Total Value',
              icon1: <TrendingUp className="h-4 w-4 text-muted-foreground" />,
              icon2: <Target className="h-4 w-4 text-muted-foreground" />
            };
        case 'percentChange':
            return { 
              label1: 'Initial Value', 
              label2: 'Final Value',
              icon1: <TrendingDown className="h-4 w-4 text-muted-foreground" />,
              icon2: <TrendingUp className="h-4 w-4 text-muted-foreground" />
            };
        default:
             return { 
               label1: 'Value 1', 
               label2: 'Value 2',
               icon1: <Percent className="h-4 w-4 text-muted-foreground" />,
               icon2: <Percent className="h-4 w-4 text-muted-foreground" />
             };
    }
  }

  const applyExample = (value1: number, value2: number) => {
    form.setValue('value1', value1);
    form.setValue('value2', value2);
  };
  
  const { label1, label2, icon1, icon2 } = getLabels();

  const getChangeColor = (changeType?: string) => {
    const colors = {
      'increase': 'text-green-500',
      'decrease': 'text-red-500',
      'no-change': 'text-gray-500',
    };
    return colors[changeType as keyof typeof colors] || 'text-primary';
  };

  const getChangeIcon = (changeType?: string) => {
    const icons = {
      'increase': <TrendingUp className="h-5 w-5" />,
      'decrease': <TrendingDown className="h-5 w-5" />,
      'no-change': <span className="text-lg">→</span>,
    };
    return icons[changeType as keyof typeof icons] || <Percent className="h-5 w-5" />;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Percentage Calculator</CardTitle>
            <CardDescription>
              Calculate percentages, find what percent one number is of another, or determine percentage changes
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="p-6 space-y-6">
                <FormField
                    control={form.control}
                    name="calculationType"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-muted-foreground" />
                          Calculation Type
                        </FormLabel>
                        <Select onValueChange={(value) => {
                            field.onChange(value);
                            setResult(null);
                            setSuggestion('');
                            form.clearErrors();
                        }} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a calculation type" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="percentOf">
                                  <div className="flex items-center gap-2">
                                    <Percent className="h-4 w-4" />
                                    What is X% of Y?
                                  </div>
                                </SelectItem>
                                <SelectItem value="isWhatPercentOf">
                                  <div className="flex items-center gap-2">
                                    <Target className="h-4 w-4" />
                                    X is what percent of Y?
                                  </div>
                                </SelectItem>
                                <SelectItem value="percentChange">
                                  <div className="flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4" />
                                    Percentage change from X to Y
                                  </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Quick Examples */}
                <div className="pt-2">
                  <FormLabel className="text-sm">Quick Examples</FormLabel>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {getCalculationExamples().map((example, index) => (
                      <Button
                        key={index}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-auto py-2 text-xs"
                        onClick={() => applyExample(example.value1, example.value2)}
                      >
                        <div className="text-center">
                          <div className="font-medium">{example.label}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="value1"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              {icon1}
                              {label1}
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step={calculationType === 'percentOf' ? '0.1' : 'any'}
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="value2"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              {icon2}
                              {label2}
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="any"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button type="button" variant="outline" onClick={resetCalculator}>
                  Reset
                </Button>
                <Button type="submit">
                  <CalculatorIcon className="mr-2 h-4 w-4" />
                  Calculate Percentage
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        {/* Visual Representation */}
        {result && calculationType === 'percentOf' && (
          <Card>
            <CardHeader>
              <CardTitle>Visual Representation</CardTitle>
              <CardDescription>
                See the percentage visually compared to the whole
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span>0%</span>
                  <span>{form.getValues('value1')}%</span>
                  <span>100%</span>
                </div>
                <Progress value={form.getValues('value1')} className="h-3" />
                <div className="text-center text-sm text-muted-foreground">
                  {result.value} represents {form.getValues('value1')}% of {form.getValues('value2').toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Results Panel */}
      <div>
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle>Percentage Result</CardTitle>
          </CardHeader>
          <CardContent className="text-center p-6 space-y-6">
            {result ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">{result.text}</p>
                  <div className="flex items-center justify-center gap-2 my-2">
                    {getChangeIcon(result.changeType)}
                    <p className={`text-4xl font-bold ${getChangeColor(result.changeType)}`}>
                      {result.value}
                    </p>
                  </div>
                  {result.changeType && result.changeType !== 'no-change' && (
                    <Badge 
                      variant="outline" 
                      className={
                        result.changeType === 'increase' ? 'bg-green-50 text-green-700 border-green-200' :
                        'bg-red-50 text-red-700 border-red-200'
                      }
                    >
                      {result.changeType === 'increase' ? 'Increase' : 'Decrease'}
                    </Badge>
                  )}
                </div>

                {calculationType === 'percentChange' && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">Absolute Change</p>
                    <p className="text-xl font-semibold">
                      {Math.abs(form.getValues('value2') - form.getValues('value1')).toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {form.getValues('value2') > form.getValues('value1') ? 'Increase of' : 'Decrease of'}
                    </p>
                  </div>
                )}

                {calculationType === 'isWhatPercentOf' && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">Fraction Form</p>
                    <p className="text-lg font-semibold font-mono">
                      {form.getValues('value1')} / {form.getValues('value2')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Simplified: {(form.getValues('value1') / form.getValues('value2')).toFixed(3)}
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    <p className="text-sm font-medium">Practical Insight</p>
                  </div>
                  <p className="text-sm text-muted-foreground text-left">
                    {calculationType === 'percentOf' ? 'This percentage calculation is useful for discounts, tips, taxes, and understanding proportions in data analysis.' :
                     calculationType === 'isWhatPercentOf' ? 'This helps understand relative sizes and proportions, useful for statistics, test scores, and performance metrics.' :
                     'Percentage changes are essential for tracking growth, inflation, stock performance, and any metric that changes over time.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Percent className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Select a calculation type and enter values to see the percentage result.
                </p>
              </div>
            )}
             
            {(suggestion || suggestionLoading) && (
              <div className="pt-6 border-t">
                <CardHeader className="p-0 mb-2 flex-row items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Math Tip</CardTitle>
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
        <Tabs defaultValue="calculation" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="calculation">Calculation</TabsTrigger>
            <TabsTrigger value="applications">Real-World Applications</TabsTrigger>
            <TabsTrigger value="concepts">Percentage Concepts</TabsTrigger>
          </TabsList>
          
          <TabsContent value="calculation">
            <Accordion type="single" collapsible>
              <AccordionItem value="explanation">
                <AccordionTrigger>How are percentages calculated?</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <p>
                      Percentages represent a proportion out of 100. The formulas vary based on 
                      what you're trying to calculate, but all relate to the fundamental concept of parts per hundred.
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Percentage of a Number</h4>
                        <div className="font-mono bg-muted p-4 rounded-md text-sm">
                          Result = (Percentage ÷ 100) × Base Number
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Used for calculating discounts, tips, taxes, and commissions
                        </p>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold mb-2">What Percent One Number Is of Another</h4>
                          <div className="font-mono bg-muted p-3 rounded-md text-xs">
                            Percentage = (Part ÷ Whole) × 100
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Used for test scores, market share, and performance metrics
                          </p>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-2">Percentage Change</h4>
                          <div className="font-mono bg-muted p-3 rounded-md text-xs">
                            Change % = [(New - Old) ÷ Old] × 100
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Used for growth rates, inflation, and performance changes
                          </p>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">Quick Percentage Calculations</h4>
                        <div className="text-sm space-y-2">
                          <p><strong>10%:</strong> Move decimal one place left</p>
                          <p><strong>5%:</strong> Calculate 10% and divide by 2</p>
                          <p><strong>15%:</strong> Calculate 10% + 5%</p>
                          <p><strong>20%:</strong> Calculate 10% and multiply by 2</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          <TabsContent value="applications">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Real-World Percentage Applications</h3>
                <div className="space-y-4">
                  {[
                    {
                      application: "Shopping Discounts",
                      description: "Calculate sale prices and savings during shopping",
                      example: "25% off $80 = $20 savings, final price $60"
                    },
                    {
                      application: "Restaurant Tips",
                      description: "Calculate gratuity based on service quality",
                      example: "18% tip on $45 bill = $8.10"
                    },
                    {
                      application: "Tax Calculations",
                      description: "Determine sales tax or income tax amounts",
                      example: "8.5% tax on $120 purchase = $10.20"
                    },
                    {
                      application: "Investment Returns",
                      description: "Track stock performance and portfolio growth",
                      example: "Stock from $50 to $65 = 30% increase"
                    },
                    {
                      application: "Academic Grading",
                      description: "Calculate test scores and final grades",
                      example: "45 correct out of 50 questions = 90% score"
                    },
                    {
                      application: "Business Metrics",
                      description: "Analyze profit margins and market share",
                      example: "$25,000 profit on $100,000 revenue = 25% margin"
                    }
                  ].map((item, index) => (
                    <div key={index} className="flex items-start gap-4 py-3 border-b">
                      <Badge variant="outline" className="whitespace-nowrap border-blue-200 bg-blue-50">
                        {item.application}
                      </Badge>
                      <div className="flex-1">
                        <p className="font-medium">{item.description}</p>
                        <p className="text-sm text-muted-foreground mt-1 font-mono">{item.example}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="concepts">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Percent className="h-5 w-5 text-blue-500" />
                  <h3 className="font-semibold">Key Percentage Concepts</h3>
                </div>
                <div className="space-y-4 text-sm">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Base Value Concept</h4>
                    <p className="text-muted-foreground">
                      The base value (100%) is crucial in percentage calculations. A 50% increase from 
                      100 to 150 is different from a 50% increase from 200 to 300, even though both are 50% increases.
                    </p>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Percentage Points vs Percent</h4>
                    <p className="text-muted-foreground">
                      Percentage points measure absolute difference (from 5% to 10% is a 5 percentage point increase), 
                      while percent change measures relative difference (from 5% to 10% is a 100% increase).
                    </p>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Compound Percentage Changes</h4>
                    <p className="text-muted-foreground">
                      Multiple percentage changes compound multiplicatively. A 20% increase followed by 
                      a 20% decrease doesn't return to the original value: 100 → 120 → 96 (4% net decrease).
                    </p>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <h4 className="font-semibold">Common Percentage Pitfalls</h4>
                    </div>
                    <ul className="space-y-1 text-sm">
                      <li>• Confusing percentage of with percentage change</li>
                      <li>• Misunderstanding the base value in calculations</li>
                      <li>• Forgetting that percentages over 100% are valid (e.g., 150% growth)</li>
                      <li>• Not considering the order of operations in multiple percentage changes</li>
                    </ul>
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
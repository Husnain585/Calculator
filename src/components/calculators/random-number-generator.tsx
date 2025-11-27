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
import { Calculator as CalculatorIcon, Lightbulb, Shuffle, Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Copy, AlertTriangle, Info, Sparkles, History } from 'lucide-react';
import { suggestNextStep } from '@/ai/flows/suggest-next-step';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { Slider } from '@/components/ui/slider';

const formSchema = z.object({
  min: z.coerce.number().int('Minimum value must be an integer.'),
  max: z.coerce.number().int('Maximum value must be an integer.'),
  count: z.coerce.number().int().min(1).max(100).default(1),
  allowDuplicates: z.boolean().default(false),
}).refine(data => data.min < data.max, {
  message: 'Minimum value must be less than the maximum value.',
  path: ['min'],
});

type FormValues = z.infer<typeof formSchema>;

interface GeneratedNumber {
  value: number;
  timestamp: Date;
}

export default function RandomNumberGenerator() {
  const [result, setResult] = useState<number[]>([]);
  const [suggestion, setSuggestion] = useState('');
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [history, setHistory] = useState<GeneratedNumber[]>([]);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      min: 1,
      max: 100,
      count: 1,
      allowDuplicates: false,
    },
  });

  const min = form.watch('min');
  const max = form.watch('max');
  const count = form.watch('count');

  const getDiceIcon = (index: number) => {
    const diceIcons = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];
    const Icon = diceIcons[index % diceIcons.length];
    return <Icon className="h-4 w-4" />;
  };

  const getPresetRanges = () => [
    { min: 1, max: 6, label: 'Dice Roll', icon: <Dice1 className="h-4 w-4" /> },
    { min: 1, max: 10, label: '1-10', icon: <span>🔟</span> },
    { min: 1, max: 100, label: '1-100', icon: <span>💯</span> },
    { min: 0, max: 9, label: 'Single Digit', icon: <span>🔢</span> },
    { min: 100, max: 999, label: '3 Digits', icon: <span>🎰</span> },
    { min: 1000, max: 9999, label: '4 Digits', icon: <span>📟</span> },
  ];

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    const { min, max, count, allowDuplicates } = data;
    
    const generatedNumbers: number[] = [];
    
    for (let i = 0; i < count; i++) {
      let randomNumber: number;
      do {
        randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
      } while (!allowDuplicates && generatedNumbers.includes(randomNumber) && generatedNumbers.length < (max - min + 1));
      
      generatedNumbers.push(randomNumber);
      
      // Add to history
      setHistory(prev => [{ value: randomNumber, timestamp: new Date() }, ...prev.slice(0, 19)]);
    }
    
    setResult(generatedNumbers);

    setSuggestionLoading(true);
    setSuggestion('');
    try {
      const res = await suggestNextStep({ 
        calculatorName: 'Random Number Generator',
        range: `${min}-${max}`,
        count,
        numbers: generatedNumbers
      });
      setSuggestion(res.suggestion);
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
      setSuggestion("Use this for games, picking winners, or whenever you need an unbiased choice. Try changing the range for different results!");
    } finally {
      setSuggestionLoading(false);
    }
  };

  const resetCalculator = () => {
    form.reset({
      min: 1,
      max: 100,
      count: 1,
      allowDuplicates: false,
    });
    setResult([]);
    setSuggestion('');
    setSuggestionLoading(false);
  };

  const copyToClipboard = () => {
    if (result.length === 0) return;
    const text = result.join(', ');
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${result.length} number(s) copied to clipboard.`,
      duration: 2000,
    });
  };

  const applyPreset = (min: number, max: number) => {
    form.setValue('min', min);
    form.setValue('max', max);
  };

  const regenerate = () => {
    const currentValues = form.getValues();
    onSubmit(currentValues);
  };

  const getRangeSize = () => max - min + 1;
  const isRangeValidForCount = count <= getRangeSize();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Random Number Generator</CardTitle>
            <CardDescription>
              Generate random numbers within any range with customizable options
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="p-6 space-y-6">
                {/* Preset Ranges */}
                <div className="space-y-4">
                  <FormLabel className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                    Quick Presets
                  </FormLabel>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                    {getPresetRanges().map((preset, index) => (
                      <Button
                        key={index}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-auto py-2 text-xs"
                        onClick={() => applyPreset(preset.min, preset.max)}
                      >
                        <div className="flex items-center gap-1">
                          {preset.icon}
                          <span>{preset.label}</span>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Range Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="min"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Dice1 className="h-4 w-4 text-muted-foreground" />
                          Minimum Value
                        </FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="max"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Dice6 className="h-4 w-4 text-muted-foreground" />
                          Maximum Value
                        </FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Range Slider */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <FormLabel>Range: {min} to {max}</FormLabel>
                    <span className="text-sm text-muted-foreground">
                      {getRangeSize()} possible values
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium w-12">{min}</span>
                    <div className="flex-1">
                      <div className="h-2 bg-muted rounded-full relative">
                        <div 
                          className="h-full bg-primary rounded-full"
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-medium w-12">{max}</span>
                  </div>
                </div>

                {/* Count and Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="count"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Shuffle className="h-4 w-4 text-muted-foreground" />
                          Number Count
                        </FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <Input type="number" min="1" max="100" {...field} />
                            <Slider
                              min={1}
                              max={Math.min(100, getRangeSize())}
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
                  <FormField
                    control={form.control}
                    name="allowDuplicates"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-3 space-y-0 border rounded-lg p-4">
                        <FormControl>
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            checked={field.value}
                            onChange={field.onChange}
                            disabled={count > getRangeSize()}
                          />
                        </FormControl>
                        <div className="space-y-1">
                          <FormLabel className="font-medium cursor-pointer">
                            Allow Duplicates
                          </FormLabel>
                          <p className="text-sm text-muted-foreground">
                            {count > getRangeSize() 
                              ? `Cannot disable - range too small for ${count} unique numbers`
                              : 'Allow same number to appear multiple times'
                            }
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                {!isRangeValidForCount && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <p className="text-sm text-yellow-800">
                        You're generating {count} numbers from a range of only {getRangeSize()} values. 
                        Some numbers will be duplicated.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex gap-4">
                <Button type="button" variant="outline" onClick={resetCalculator}>
                  Reset
                </Button>
                <Button type="submit" className="flex-1">
                  <Shuffle className="mr-2 h-4 w-4" />
                  Generate Numbers
                </Button>
                {result.length > 0 && (
                  <Button type="button" variant="outline" onClick={regenerate}>
                    <Shuffle className="h-4 w-4" />
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
                Generation History
              </CardTitle>
              <CardDescription>
                Recently generated numbers (last 20)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {history.slice(0, 10).map((item, index) => (
                  <div
                    key={index}
                    className="text-center p-3 border rounded-lg bg-muted/50"
                  >
                    <div className="text-lg font-bold text-primary">{item.value}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.timestamp.toLocaleTimeString()}
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
            <CardTitle>Generated Numbers</CardTitle>
          </CardHeader>
          <CardContent className="text-center p-6 space-y-6">
            {result.length > 0 ? (
              <div className="space-y-4">
                <div className="space-y-3">
                  {result.map((number, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        {getDiceIcon(index)}
                        <span className="font-mono text-sm">#{index + 1}</span>
                      </div>
                      <span className="text-2xl font-bold text-primary">{number}</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Range</p>
                    <p className="font-semibold">{min} - {max}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Count</p>
                    <p className="font-semibold">{result.length}</p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    <p className="text-sm font-medium">Statistics</p>
                  </div>
                  <div className="text-sm text-muted-foreground text-left space-y-1">
                    <p>• Average: {(result.reduce((a, b) => a + b, 0) / result.length).toFixed(2)}</p>
                    <p>• Min: {Math.min(...result)}</p>
                    <p>• Max: {Math.max(...result)}</p>
                    {result.length > 1 && (
                      <p>• Unique: {new Set(result).size} / {result.length}</p>
                    )}
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={copyToClipboard}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy All Numbers
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <Dice1 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Configure your range and generate random numbers.
                </p>
              </div>
            )}
             
            {(suggestion || suggestionLoading) && (
              <div className="pt-6 border-t">
                <CardHeader className="p-0 mb-2 flex-row items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Usage Tip</CardTitle>
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
        <Tabs defaultValue="usage" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="usage">Usage Guide</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="technology">Randomness Technology</TabsTrigger>
          </TabsList>
          
          <TabsContent value="usage">
            <Accordion type="single" collapsible>
              <AccordionItem value="explanation">
                <AccordionTrigger>How does random number generation work?</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <p>
                      This generator uses JavaScript's Math.random() function to create pseudorandom numbers 
                      that are uniformly distributed across your specified range.
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Random Number Formula</h4>
                        <div className="font-mono bg-muted p-4 rounded-md text-sm">
                          Random = Math.floor(Math.random() * (max - min + 1)) + min
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          This ensures every number in your range has an equal probability of being selected
                        </p>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold mb-2">Pseudorandom vs True Random</h4>
                          <div className="text-sm space-y-2">
                            <p><strong>Pseudorandom:</strong> Algorithmically generated, reproducible with seed</p>
                            <p><strong>True Random:</strong> Based on physical phenomena, unpredictable</p>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-2">Uniform Distribution</h4>
                          <div className="text-sm space-y-2">
                            <p>• Each number has equal probability</p>
                            <p>• No bias toward any value</p>
                            <p>• Statistically random within range</p>
                          </div>
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
                <h3 className="font-semibold mb-4">Practical Applications</h3>
                <div className="space-y-4">
                  {[
                    {
                      application: "Games & Gambling",
                      description: "Dice rolls, card shuffling, slot machines, and game mechanics",
                      examples: "Dice games, lottery numbers, random events"
                    },
                    {
                      application: "Statistical Sampling",
                      description: "Select random samples from populations for research and surveys",
                      examples: "A/B testing, survey participants, quality control"
                    },
                    {
                      application: "Cryptography",
                      description: "Generate keys, nonces, and salts for security applications",
                      examples: "Encryption keys, password salts, session tokens"
                    },
                    {
                      application: "Simulations",
                      description: "Monte Carlo methods and probabilistic modeling",
                      examples: "Financial modeling, physics simulations, AI training"
                    },
                    {
                      application: "Decision Making",
                      description: "Break ties, assign tasks, or make unbiased choices",
                      examples: "Raffle winners, task assignment, random selection"
                    }
                  ].map((item, index) => (
                    <div key={index} className="flex items-start gap-4 py-3 border-b">
                      <Badge variant="outline" className="whitespace-nowrap border-purple-200 bg-purple-50">
                        {item.application}
                      </Badge>
                      <div className="flex-1">
                        <p className="font-medium">{item.description}</p>
                        <p className="text-sm text-muted-foreground mt-1">{item.examples}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="technology">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Dice1 className="h-5 w-5 text-purple-500" />
                  <h3 className="font-semibold">Randomness Technology</h3>
                </div>
                <div className="space-y-4 text-sm">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Pseudorandom Number Generators (PRNGs)</h4>
                    <p className="text-muted-foreground">
                      Most computer random number generators are pseudorandom - they use mathematical algorithms 
                      to produce sequences that appear random. They're fast and reproducible with the same seed, 
                      making them ideal for simulations and games.
                    </p>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">True Random Number Generators (TRNGs)</h4>
                    <p className="text-muted-foreground">
                      True random numbers come from physical phenomena like atmospheric noise, radioactive decay, 
                      or quantum effects. They're used in cryptography where absolute unpredictability is required, 
                      but they're slower and more resource-intensive.
                    </p>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <h4 className="font-semibold">Security Considerations</h4>
                    </div>
                    <p className="text-sm">
                      For cryptographic purposes or security-sensitive applications, always use cryptographically 
                      secure random number generators. Standard Math.random() is suitable for games, simulations, 
                      and general-purpose use but should not be used for security-sensitive operations.
                    </p>
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
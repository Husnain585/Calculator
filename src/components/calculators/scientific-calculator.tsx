"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { evaluate } from 'mathjs';
import { Calculator, Lightbulb, Delete, History, AlertTriangle, Info, Squirrel } from 'lucide-react';
import { suggestNextStep } from '@/ai/flows/suggest-next-step';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';

const buttonLayout = [
  ['(', ')', '%', 'AC'],
  ['sin', 'cos', 'tan', 'ln'],
  ['7', '8', '9', '/'],
  ['4', '5', '6', '*'],
  ['1', '2', '3', '-'],
  ['0', '.', '=', '+'],
];

interface CalculationHistory {
  expression: string;
  result: string;
  timestamp: Date;
}

export default function ScientificCalculator() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [history, setHistory] = useState<CalculationHistory[]>([]);
  const [suggestion, setSuggestion] = useState('');
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const { toast } = useToast();

  const handleButtonClick = async (value: string) => {
    if (value === 'AC') {
      setInput('');
      setResult('');
    } else if (value === '=') {
      try {
        // Replace percentage and handle scientific functions
        let expression = input.replace(/%/g, '/100');
        
        // Handle scientific functions
        expression = expression
          .replace(/sin\(/g, 'sin(')
          .replace(/cos\(/g, 'cos(')
          .replace(/tan\(/g, 'tan(')
          .replace(/ln\(/g, 'log(');

        const evalResult = evaluate(expression);
        const resultString = evalResult.toString();
        setResult(resultString);
        
        // Add to history
        setHistory(prev => [{
          expression: input,
          result: resultString,
          timestamp: new Date()
        }, ...prev.slice(0, 9)]);

        // Get AI suggestion
        setSuggestionLoading(true);
        setSuggestion('');
        try {
          const res = await suggestNextStep({ 
            calculatorName: 'Scientific Calculator',
            expression: input,
            result: resultString
          });
          setSuggestion(res.suggestion);
        } catch (error) {
          console.error('Failed to get AI suggestion:', error);
          setSuggestion("Use parentheses to ensure correct order of operations. Remember: sin/cos/tan use radians by default.");
        } finally {
          setSuggestionLoading(false);
        }

      } catch (error) {
        setResult('Error');
        toast({
          title: 'Calculation Error',
          description: 'Please check your expression syntax',
          variant: 'destructive',
        });
      }
    } else if (value === 'DEL') {
      setInput(prev => prev.slice(0, -1));
    } else {
      setInput((prev) => prev + value);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    toast({
      title: 'History Cleared',
      description: 'Calculation history has been cleared',
    });
  };

  const loadFromHistory = (calc: CalculationHistory) => {
    setInput(calc.expression);
    setResult(calc.result);
  };

  const getButtonVariant = (btn: string) => {
    if (['/', '*', '-', '+', '=', 'sin', 'cos', 'tan', 'ln'].includes(btn)) {
      return 'default';
    }
    if (btn === 'AC') {
      return 'destructive';
    }
    if (['(', ')', '%'].includes(btn)) {
      return 'outline';
    }
    return 'secondary';
  };

  const getButtonSize = (btn: string) => {
    return 'h-16 text-lg font-medium';
  };

  const scientificFunctions = [
    { name: 'sin', description: 'Sine function (radians)' },
    { name: 'cos', description: 'Cosine function (radians)' },
    { name: 'tan', description: 'Tangent function (radians)' },
    { name: 'ln', description: 'Natural logarithm' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-6 w-6 text-primary" />
              Scientific Calculator
            </CardTitle>
            <CardDescription>
              Advanced calculator with scientific functions and real-time evaluation
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Display */}
            <div className="bg-muted rounded-xl p-6 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Expression</span>
                </div>
                {input && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setInput('')}
                    className="h-8 w-8 p-0"
                  >
                    <Delete className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="text-muted-foreground text-lg font-mono min-h-6 break-all">
                {input || "0"}
              </div>
              
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-2">
                  <Squirrel className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Result</span>
                </div>
                {result && !result.includes('Error') && (
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    Valid
                  </Badge>
                )}
                {result.includes('Error') && (
                  <Badge variant="outline" className="bg-red-50 text-red-700">
                    Error
                  </Badge>
                )}
              </div>
              <div className={`text-3xl font-bold font-mono min-h-12 break-all ${
                result.includes('Error') ? 'text-red-500' : 'text-foreground'
              }`}>
                {result || (input || "0")}
              </div>
            </div>

            {/* Calculator Grid */}
            <div className="grid grid-cols-4 gap-3">
              {buttonLayout.flat().map((btn) => (
                <Button
                  key={btn}
                  onClick={() => handleButtonClick(btn)}
                  variant={getButtonVariant(btn)}
                  className={getButtonSize(btn)}
                >
                  {btn}
                </Button>
              ))}
            </div>

            {/* Additional Functions */}
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium">Scientific Functions Guide</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {scientificFunctions.map((func) => (
                  <div
                    key={func.name}
                    className="text-center p-3 border rounded-lg bg-muted/50"
                  >
                    <div className="font-mono font-bold">{func.name}(x)</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {func.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calculation History */}
        {history.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Recent Calculations
              </CardTitle>
              <CardDescription>
                Your last 10 calculations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {history.slice(0, 5).map((calc, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer group"
                    onClick={() => loadFromHistory(calc)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm text-muted-foreground truncate">
                        {calc.expression}
                      </div>
                      <div className="font-mono font-bold text-lg truncate">
                        = {calc.result}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                      {calc.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={clearHistory}
                >
                  Clear History
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Results & Info Panel */}
      <div>
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle>Calculator Info</CardTitle>
          </CardHeader>
          <CardContent className="text-center p-6 space-y-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Current Expression</p>
                <p className="text-xl font-mono font-bold text-primary my-2 break-all">
                  {input || "0"}
                </p>
              </div>

              {result && !result.includes('Error') && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">Computed Result</p>
                  <p className="text-3xl font-bold font-mono text-green-600 my-2">
                    {result}
                  </p>
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    Successfully Evaluated
                  </Badge>
                </div>
              )}

              {result.includes('Error') && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">Evaluation Status</p>
                  <div className="flex items-center justify-center gap-2 my-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <p className="text-xl font-bold text-red-500">Syntax Error</p>
                  </div>
                  <Badge variant="outline" className="bg-red-50 text-red-700">
                    Check Expression
                  </Badge>
                </div>
              )}

              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 justify-center mb-2">
                  <Info className="h-4 w-4 text-blue-500" />
                  <p className="text-sm font-medium">Quick Tips</p>
                </div>
                <div className="text-sm text-muted-foreground text-left space-y-2">
                  <p>• Use parentheses for complex expressions</p>
                  <p>• Scientific functions use radians</p>
                  <p>• % converts to decimal automatically</p>
                  <p>• Follow standard order of operations</p>
                </div>
              </div>
            </div>

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
        <Tabs defaultValue="operations" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="operations">Operations Guide</TabsTrigger>
            <TabsTrigger value="functions">Scientific Functions</TabsTrigger>
            <TabsTrigger value="examples">Examples</TabsTrigger>
          </TabsList>
          
          <TabsContent value="operations">
            <Accordion type="single" collapsible>
              <AccordionItem value="order">
                <AccordionTrigger>Order of Operations (PEMDAS)</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <p>
                      The calculator follows standard mathematical order of operations:
                    </p>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <h4 className="font-semibold mb-2">Priority Order</h4>
                        <ol className="space-y-1 list-decimal list-inside">
                          <li>Parentheses: ( )</li>
                          <li>Functions: sin, cos, tan, ln</li>
                          <li>Multiplication & Division: × ÷</li>
                          <li>Addition & Subtraction: + -</li>
                        </ol>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Examples</h4>
                        <div className="font-mono space-y-1 text-xs">
                          <p>2 + 3 × 4 = 14 (not 20)</p>
                          <p>(2 + 3) × 4 = 20</p>
                          <p>sin(0) + 1 = 1</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          <TabsContent value="functions">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Scientific Functions Reference</h3>
                <div className="space-y-4">
                  {[
                    {
                      function: "sin(x), cos(x), tan(x)",
                      description: "Trigonometric functions (x in radians)",
                      usage: "sin(π/2) = 1, cos(0) = 1",
                      range: "All real numbers"
                    },
                    {
                      function: "ln(x)",
                      description: "Natural logarithm (base e)",
                      usage: "ln(e) = 1, ln(1) = 0",
                      range: "x > 0"
                    },
                    {
                      function: "x % y",
                      description: "Percentage calculation",
                      usage: "50% = 0.5, 25% of 80 = 20",
                      range: "Any numbers"
                    },
                    {
                      function: "( )",
                      description: "Parentheses for grouping",
                      usage: "2*(3+4) = 14",
                      range: "Complex expressions"
                    }
                  ].map((item, index) => (
                    <div key={index} className="flex items-start gap-4 py-3 border-b">
                      <Badge variant="outline" className="whitespace-nowrap border-blue-200 bg-blue-50 font-mono">
                        {item.function}
                      </Badge>
                      <div className="flex-1">
                        <p className="font-medium">{item.description}</p>
                        <div className="grid grid-cols-2 gap-2 mt-1 text-sm text-muted-foreground">
                          <span>Usage: {item.usage}</span>
                          <span>Range: {item.range}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="examples">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Calculator className="h-5 w-5 text-blue-500" />
                  <h3 className="font-semibold">Common Calculation Examples</h3>
                </div>
                <div className="space-y-4 text-sm">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Basic Arithmetic</h4>
                    <div className="font-mono space-y-1 text-xs">
                      <p>• (2 + 3) × 4 = 20</p>
                      <p>• 10 - 3 × 2 = 4</p>
                      <p>• 15% of 200 = 30</p>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Scientific Calculations</h4>
                    <div className="font-mono space-y-1 text-xs">
                      <p>• sin(0) + cos(0) = 1</p>
                      <p>• ln(e^2) = 2</p>
                      <p>• tan(π/4) = 1</p>
                    </div>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <h4 className="font-semibold">Common Errors to Avoid</h4>
                    </div>
                    <ul className="space-y-1 text-sm">
                      <li>• Missing parentheses: sin(π vs sin(π))</li>
                      <li>• Division by zero: 1/0</li>
                      <li>• Invalid function arguments: ln(-1)</li>
                      <li>• Unclosed parentheses: (2+3)</li>
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
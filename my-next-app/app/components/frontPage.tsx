"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Calendar,
  DollarSign,
  FileText,
  Store,
  Upload,
  History,
  Settings,
  CloudUpload,
  AlertTriangle,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Info,
  TrendingUp,
  Clock,
  MapPin,
  Globe,
  Calculator,
  Copy,
  Users,
  UserX,
  X,
  Sun,
  Moon,
  Download,
  FileSpreadsheet,
  FileText as FileTextIcon,
} from "lucide-react";
import { parseTransactionFile } from "./parseTransactions";
import { scoreAndGroup, type RiskGroups, analyzeBusinessHealth, type BusinessHealthMetrics } from "./scoreTransactions";

export default function TransactScanUpload() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [riskGroups, setRiskGroups] = useState<RiskGroups | null>(null);
  const [businessHealth, setBusinessHealth] = useState<BusinessHealthMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Apply theme to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setRiskGroups(null);
    setBusinessHealth(null);

    try {
      const transactions = await parseTransactionFile(file);
      const groups = scoreAndGroup(transactions);
      const health = analyzeBusinessHealth(transactions);
      
      setRiskGroups(groups);
      setBusinessHealth(health);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process file");
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Export functions
  const exportToCSV = useCallback(() => {
    if (!riskGroups || !businessHealth) return;

    const csvData = [
      ['Transaction ID', 'Name', 'Amount', 'Country', 'Date', 'Risk Score', 'Risk Level', 'Flags'],
      ...Object.entries(riskGroups).flatMap(([level, transactions]) =>
        transactions.map(tx => [
          tx.transactionID,
          tx.name,
          tx.amount,
          tx.country,
          tx.dateTime?.toISOString(),
          tx.score,
          level.replace('_', ' '),
          tx.flags.join('; ')
        ])
      )
    ];

    const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transaction-analysis.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [riskGroups, businessHealth]);

  const exportToPDF = useCallback(() => {
    // Basic PDF export - in a real app, you'd use a library like jsPDF
    alert('PDF export functionality would require additional libraries like jsPDF. This is a placeholder.');
  }, []);

  const exportToExcel = useCallback(() => {
    // Basic Excel export - in a real app, you'd use a library like xlsx
    alert('Excel export functionality would require additional libraries like xlsx. This is a placeholder.');
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === "text/csv") {
      const file = files[0];
      setUploadedFile(file);
      processFile(file);
    }
  }, [processFile]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        const file = files[0];
        setUploadedFile(file);
        processFile(file);
      }
    },
    [processFile]
  );

  const dataPoints = [
    {
      icon: Calendar,
      title: "Date",
      description: "YYYY-MM-DD, MM/DD/YYYY, or ISO formats supported.",
    },
    {
      icon: DollarSign,
      title: "Amount",
      description: "Numerical values with or without currency symbols.",
    },
    {
      icon: FileText,
      title: "Description",
      description: "Transaction details or internal reference strings.",
    },
    {
      icon: Store,
      title: "Merchant",
      description: "Vendor name, location, or store ID identification.",
    },
  ];

  // Function to get appropriate icon for risk flag type
  const getFlagIcon = (flag: string) => {
    const lowerFlag = flag.toLowerCase();
    
    if (lowerFlag.includes('amount') && (lowerFlag.includes('negative') || lowerFlag.includes('zero'))) {
      return <X className="w-5 h-5 text-red-500" />;
    }
    if (lowerFlag.includes('amount') && lowerFlag.includes('parsed')) {
      return <AlertTriangle className="w-5 h-5 text-orange-500" />;
    }
    if (lowerFlag.includes('large') || lowerFlag.includes('very large')) {
      return <TrendingUp className="w-5 h-5 text-red-500" />;
    }
    if (lowerFlag.includes('structuring')) {
      return <Calculator className="w-5 h-5 text-orange-500" />;
    }
    if (lowerFlag.includes('high-risk country')) {
      return <Globe className="w-5 h-5 text-red-500" />;
    }
    if (lowerFlag.includes('elevated-risk country')) {
      return <MapPin className="w-5 h-5 text-orange-500" />;
    }
    if (lowerFlag.includes('date') || lowerFlag.includes('invalid')) {
      return <Calendar className="w-5 h-5 text-orange-500" />;
    }
    if (lowerFlag.includes('off-hours')) {
      return <Clock className="w-5 h-5 text-blue-500" />;
    }
    if (lowerFlag.includes('duplicate')) {
      return <Copy className="w-5 h-5 text-red-500" />;
    }
    if (lowerFlag.includes('velocity') || lowerFlag.includes('appears')) {
      return <Users className="w-5 h-5 text-orange-500" />;
    }
    if (lowerFlag.includes('round amount')) {
      return <Calculator className="w-5 h-5 text-yellow-500" />;
    }
    if (lowerFlag.includes('missing') && lowerFlag.includes('name')) {
      return <UserX className="w-5 h-5 text-red-500" />;
    }
    if (lowerFlag.includes('keyword')) {
      return <AlertTriangle className="w-5 h-5 text-red-500" />;
    }
    if (lowerFlag.includes('high-frequency') || lowerFlag.includes('activity')) {
      return <TrendingUp className="w-5 h-5 text-red-500" />;
    }
    
    return <AlertTriangle className="w-5 h-5 text-gray-500" />;
  };

  return (
    <div className={`min-h-screen flex transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Sidebar */}
      <aside className={`w-64 border-r p-6 sticky top-0 h-screen ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>TransactScan</span>
        </div>

        <nav className="space-y-2">
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 text-teal-600 bg-teal-50 rounded-lg font-medium"
          >
            <Upload className="w-5 h-5" />
            Upload
          </a>
          <button
            onClick={() => setShowSettings(true)}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg w-full text-left hover:bg-gray-50 ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600'}`}
          >
            <Settings className="w-5 h-5" />
            Settings
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-12">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Import Transactions
              </h1>
              <p className={`text-gray-500 mt-1 ${isDarkMode ? 'text-gray-400' : ''}`}>
                Upload your financial statements in CSV format. Our system will
                automatically parse and categorize your data for
                reconciliation.
              </p>
            </div>
          </div>

          {/* Upload Box */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-xl p-12 text-center transition-all
              ${
                isDragging
                  ? "border-teal-500 bg-teal-50"
                  : `border-gray-300 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} hover:border-teal-400`
              }
              ${uploadedFile ? "border-teal-500 bg-teal-50" : ""}
            `}
          >
            <div className="flex flex-col items-center">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                  uploadedFile ? "bg-teal-100" : "bg-gray-100"
                }`}
              >
                <CloudUpload
                  className={`w-8 h-8 ${uploadedFile ? "text-teal-600" : "text-gray-400"}`}
                />
              </div>

              {uploadedFile ? (
                <>
                  <p className={`text-lg font-medium mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {uploadedFile.name}
                  </p>
                  <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {(uploadedFile.size / 1024).toFixed(1)} KB
                  </p>
                  <button
                    onClick={() => {
                      setUploadedFile(null);
                      setRiskGroups(null);
                      setBusinessHealth(null);
                      setError(null);
                    }}
                    className="text-sm text-teal-600 hover:text-teal-700"
                  >
                    Remove and upload a different file
                  </button>
                </>
              ) : (
                <>
                  <p className={`text-lg font-medium mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Drag and drop CSV files
                  </p>
                  <p className={`text-sm mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Up to 50MB per file. Multiple files can be processed
                    simultaneously.
                  </p>
                  <label className="cursor-pointer">
                    <span className="bg-teal-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-teal-700 transition-colors inline-block">
                      Browse Files
                    </span>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </>
              )}
            </div>
          </div>

          {/* Processing Status */}
          {isProcessing && (
            <div className={`mt-8 border-2 rounded-xl p-6 shadow-sm ${isDarkMode ? 'bg-slate-950 border-blue-800' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'}`}>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className={`animate-spin rounded-full h-8 w-8 border-4 ${isDarkMode ? 'border-slate-700' : 'border-blue-200'}`}></div>
                  <div className={`absolute inset-0 rounded-full h-8 w-8 border-4 ${isDarkMode ? 'border-slate-600 border-t-transparent' : 'border-blue-600 border-t-transparent'} animate-spin`}></div>
                </div>
                <div>
                  <p className="text-blue-800 dark:text-blue-200 font-semibold text-lg">Analyzing Your Transactions</p>
                  <p className="text-blue-600 dark:text-blue-300 text-sm">Our AI is scanning for potential risks and anomalies...</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
              <p className="text-red-800 dark:text-red-200 font-medium">Error: {error}</p>
            </div>
          )}

          {/* Results Display */}
          {riskGroups && (
            <div className="mt-12 space-y-8">
              <div className={`rounded-xl p-6 border ${isDarkMode ? 'bg-slate-950 border-blue-800' : 'bg-blue-50 border-blue-200'}`}>
                <div className="flex items-start gap-3">
                  <Info className={`w-6 h-6 mt-1 ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`} />
                  <div>
                    <h2 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-blue-100' : 'text-blue-900'}`}>Risk Analysis Results</h2>
                    <p className={`mb-3 ${isDarkMode ? 'text-blue-200' : 'text-blue-800'}`}>
                      Our system has analyzed your transactions for potential financial risks including money laundering, fraud, and regulatory compliance issues.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-blue-900 dark:text-blue-100">Risk Levels:</p>
                        <ul className="text-blue-700 dark:text-blue-300 space-y-1 mt-1">
                          <li><span className="font-medium">High Risk (76-100):</span> Requires immediate investigation</li>
                          <li><span className="font-medium">Moderate Risk (51-75):</span> Should be monitored closely</li>
                          <li><span className="font-medium">Low Risk (26-50):</span> Review if patterns emerge</li>
                          <li><span className="font-medium">Safe (0-25):</span> No significant concerns detected</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium text-blue-900 dark:text-blue-100">Common Risk Factors:</p>
                        <ul className="text-blue-700 dark:text-blue-300 space-y-1 mt-1">
                          <li>• High-frequency transactions from same person</li>
                          <li>• Transactions from high-risk countries</li>
                          <li>• Suspicious amounts or timing</li>
                          <li>• Missing or invalid data</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                      <ShieldAlert className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-red-800 dark:text-red-200 text-lg">High Risk</h3>
                  </div>
                  <p className="text-4xl font-bold text-red-600 dark:text-red-400 mb-2">{riskGroups.high_risk.length}</p>
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium">transactions flagged</p>
                  <p className="text-xs text-red-500 dark:text-red-500 mt-3">Requires immediate attention</p>
                </div>
                
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-2 border-orange-200 dark:border-orange-800 rounded-xl p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-orange-800 dark:text-orange-200 text-lg">Moderate Risk</h3>
                  </div>
                  <p className="text-4xl font-bold text-orange-600 dark:text-orange-400 mb-2">{riskGroups.risky.length}</p>
                  <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">transactions flagged</p>
                  <p className="text-xs text-orange-500 dark:text-orange-500 mt-3">Monitor closely</p>
                </div>
                
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-xl p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center">
                      <Info className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 text-lg">Low Risk</h3>
                  </div>
                  <p className="text-4xl font-bold text-yellow-600 dark:text-yellow-400 mb-2">{riskGroups.low_risk.length}</p>
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">transactions flagged</p>
                  <p className="text-xs text-yellow-500 dark:text-yellow-500 mt-3">Review if needed</p>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                      <ShieldCheck className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-green-800 dark:text-green-200 text-lg">Safe</h3>
                  </div>
                  <p className="text-4xl font-bold text-green-600 dark:text-green-400 mb-2">{riskGroups.safe.length}</p>
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">transactions</p>
                  <p className="text-xs text-green-500 dark:text-green-500 mt-3">No concerns detected</p>
                </div>
              </div>

              {/* Transaction Details */}
              {Object.entries(riskGroups).map(([riskLevel, transactions]) => {
                const getRiskColor = (level: string) => {
                  switch (level) {
                    case 'high_risk': return 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20';
                    case 'risky': return 'border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20';
                    case 'low_risk': return 'border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20';
                    case 'safe': return 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20';
                    default: return 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800';
                  }
                };

                const getRiskIcon = (level: string) => {
                  switch (level) {
                    case 'high_risk': return <ShieldAlert className="w-5 h-5 text-red-600" />;
                    case 'risky': return <AlertTriangle className="w-5 h-5 text-orange-600" />;
                    case 'low_risk': return <Info className="w-5 h-5 text-yellow-600" />;
                    case 'safe': return <ShieldCheck className="w-5 h-5 text-green-600" />;
                    default: return <Info className="w-5 h-5 text-gray-600" />;
                  }
                };

                return transactions.length > 0 && (
                  <div key={riskLevel} className={`border-2 rounded-xl p-8 ${getRiskColor(riskLevel)}`}>
                    <div className="flex items-center gap-3 mb-6">
                      {getRiskIcon(riskLevel)}
                      <h3 className="text-xl font-semibold text-gray-900 capitalize">
                        {riskLevel === 'risky' ? 'Moderate Risk' : riskLevel.replace('_', ' ')} Transactions ({transactions.length})
                      </h3>
                    </div>
                    
                    <div className="space-y-8 max-h-96 overflow-y-auto">
                      {transactions.map((tx, index) => (
                        <div key={index} className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                          <div className="flex justify-between items-start mb-6">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <FileText className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                                <p className="font-bold text-gray-900 dark:text-white text-xl">{tx.name}</p>
                              </div>
                              <div className="flex items-center gap-6 text-base text-gray-700 dark:text-gray-300 mb-3">
                                <span className="flex items-center gap-2">
                                  <span className="font-semibold">ID:</span> 
                                  <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm">{tx.transactionID}</span>
                                </span>
                                <span className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-blue-500" />
                                  <span className="font-medium">{tx.country}</span>
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                                ${tx.amount?.toLocaleString() ?? 'N/A'}
                              </p>
                              <div className="flex items-center gap-2 text-base text-gray-600 dark:text-gray-400">
                                <Clock className="w-4 h-4" />
                                <span className="font-medium">{tx.dateTime?.toLocaleDateString() ?? 'Invalid date'}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-start gap-6">
                            <div className="flex items-center gap-3">
                              <div className={`px-4 py-2 rounded-full text-base font-bold ${
                                tx.score >= 76 ? 'bg-red-100 text-red-800 border-2 border-red-300' :
                                tx.score >= 51 ? 'bg-orange-100 text-orange-800 border-2 border-orange-300' :
                                tx.score >= 26 ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300' :
                                'bg-green-100 text-green-800 border-2 border-green-300'
                              }`}>
                                Risk Score: {tx.score}/100
                              </div>
                            </div>
                            
                            {tx.flags.length > 0 && (
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-4">
                                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                                  <p className="text-lg font-bold text-gray-800 dark:text-gray-200">🚨 Risk Factors Identified:</p>
                                </div>
                                <div className="space-y-3">
                                  {tx.flags.map((flag, flagIndex) => (
                                    <div key={flagIndex} className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-4">
                                      {getFlagIcon(flag)}
                                      <p className="text-base font-semibold text-gray-800 dark:text-gray-200 leading-relaxed flex-1">{flag}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Business Health Dashboard */}
          {businessHealth && (
            <div className="mt-12 space-y-8">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-100">🏥 Business Health Dashboard</h2>
                    <p className="text-blue-700 dark:text-blue-300 text-lg">Holistic analysis of your business financial health</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Revenue Analysis */}
                  <div className={`rounded-xl p-6 shadow-lg ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-white text-slate-900'}`}>
                    <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>
                      💰 Revenue Analysis
                    </h3>
                    <div className="space-y-3">
                      <div className={`flex justify-between items-center p-3 rounded-lg ${isDarkMode ? 'bg-slate-900' : 'bg-green-50'}`}>
                        <span className={`font-semibold ${isDarkMode ? 'text-green-300' : 'text-green-800'}`}>Total Revenue:</span>
                        <span className={`text-xl font-bold ${isDarkMode ? 'text-green-300' : 'text-green-600'}`}>${businessHealth.revenuePatterns.totalRevenue.toLocaleString()}</span>
                      </div>
                      <div className={`flex justify-between items-center p-3 rounded-lg ${isDarkMode ? 'bg-slate-900' : 'bg-blue-50'}`}>
                        <span className={`font-semibold ${isDarkMode ? 'text-blue-300' : 'text-blue-800'}`}>Average Transaction:</span>
                        <span className={`text-xl font-bold ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>${businessHealth.revenuePatterns.averageTransaction.toFixed(2)}</span>
                      </div>
                      <div className={`flex justify-between items-center p-3 rounded-lg ${isDarkMode ? 'bg-slate-900' : businessHealth.revenuePatterns.revenueTrend === 'increasing' ? 'bg-green-50' : businessHealth.revenuePatterns.revenueTrend === 'decreasing' ? 'bg-red-50' : 'bg-yellow-50'}`}>
                        <span className={`font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>Revenue Trend:</span>
                        <span className={`text-xl font-bold capitalize ${isDarkMode ? 'text-slate-100' : businessHealth.revenuePatterns.revenueTrend === 'increasing' ? 'text-green-600' : businessHealth.revenuePatterns.revenueTrend === 'decreasing' ? 'text-red-600' : 'text-yellow-600'}`}>
                          {businessHealth.revenuePatterns.revenueTrend}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Cash Flow Risk */}
                  <div className={`rounded-xl p-6 shadow-lg ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-white text-slate-900'}`}>
                    <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>
                      💸 Cash Flow Risk Assessment
                    </h3>
                    <div className="space-y-4">
                      <div className={`p-4 rounded-lg border-2 ${isDarkMode ? 'bg-slate-900 border-slate-700' : businessHealth.cashFlowRisk.riskLevel === 'high' ? 'bg-red-50 border-red-300' : businessHealth.cashFlowRisk.riskLevel === 'medium' ? 'bg-yellow-50 border-yellow-300' : 'bg-green-50 border-green-300'}`}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-lg">Risk Level:</span>
                          <span className={`text-xl font-bold px-3 py-1 rounded-full ${
                            businessHealth.cashFlowRisk.riskLevel === 'high' ? 'bg-red-100 text-red-800' :
                            businessHealth.cashFlowRisk.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {businessHealth.cashFlowRisk.riskLevel.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">Risk Score:</span>
                          <span className="text-2xl font-bold">{businessHealth.cashFlowRisk.riskScore.toFixed(1)}/100</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className={`font-bold ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>Predictions:</h4>
                        {businessHealth.cashFlowRisk.predictions.map((prediction, index) => (
                          <p key={index} className={`p-2 rounded ${isDarkMode ? 'text-slate-200 bg-slate-900 border border-slate-700' : 'text-gray-700 bg-gray-50'}`}>• {prediction}</p>
                        ))}
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className={`font-bold ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>Recommendations:</h4>
                        {businessHealth.cashFlowRisk.recommendations.map((rec, index) => (
                          <p key={index} className={`p-2 rounded ${isDarkMode ? 'text-slate-200 bg-slate-900 border border-slate-700' : 'text-blue-700 bg-blue-50'}`}>💡 {rec}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Supplier Analysis */}
                {businessHealth.supplierAnalysis.topSuppliers.length > 0 && (
                  <div className={`rounded-xl p-6 shadow-lg ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-white text-slate-900'}`}>
                    <h3 className={`text-xl font-bold mb-6 flex items-center gap-2 ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>
                      🏪 Top Suppliers Analysis
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {businessHealth.supplierAnalysis.topSuppliers.map((supplier, index) => (
                        <div key={index} className={`border-2 rounded-lg p-4 transition-colors ${isDarkMode ? 'border-slate-700 bg-slate-900 hover:border-slate-500' : 'border-gray-200 hover:border-blue-300'}`}>
                          <h4 className={`font-bold mb-2 ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{supplier.name}</h4>
                          <div className="space-y-1 text-sm">
                            <p className="flex justify-between">
                              <span className={` ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>Total Spent:</span>
                              <span className="font-semibold">${Number(supplier.totalSpent).toFixed(2)}</span>
                            </p>
                            <p className="flex justify-between">
                              <span className={` ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>Transactions:</span>
                              <span className="font-semibold">{supplier.transactionCount}</span>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Business Health Score */}
          {businessHealth && (
            <div className="mt-12">
              <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-8 text-center">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-green-900 dark:text-green-100 mb-2">Business Health Score</h2>
                <div className="text-6xl font-bold text-green-600 dark:text-green-400 mb-2">
                  {(() => {
                    const totalTransactions = (riskGroups?.high_risk.length || 0) + (riskGroups?.risky.length || 0) + (riskGroups?.low_risk.length || 0) + (riskGroups?.safe.length || 0);
                    const highRiskCount = riskGroups?.high_risk.length || 0;
                    const riskScore = totalTransactions > 0 ? (highRiskCount / totalTransactions) * 100 : 0;
                    const businessHealthScore = Math.max(0, Math.min(100, 100 - riskScore - (businessHealth.cashFlowRisk.riskScore * 0.3)));
                    return Math.round(businessHealthScore);
                  })()}
                </div>
                <p className="text-green-700 dark:text-green-300">Out of 100 - Based on risk analysis and cash flow stability</p>
              </div>
            </div>
          )}

          {/* Supported Data Points */}
          <div className="mt-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Supported Data Points
              </h2>
              <a
                href="#"
                className="text-sm text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300"
              >
                View Mapping Guide
              </a>
            </div>

            <div className="grid grid-cols-4 gap-6">
              {dataPoints.map((point) => (
                <div key={point.title} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mb-3">
                    <point.icon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                    {point.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{point.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className={`hover:text-gray-700 ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500'}`}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Theme Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isDarkMode ? <Moon className="w-5 h-5 text-gray-600 dark:text-gray-300" /> : <Sun className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
                  <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Theme</span>
                </div>
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isDarkMode ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isDarkMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Export Options */}
              <div>
                <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  <Download className="w-5 h-5" />
                  Export Data
                </h3>
                <div className="space-y-3">
                  <button
                    onClick={exportToCSV}
                    disabled={!riskGroups}
                    className={`w-full flex items-center gap-3 px-4 py-3 border rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      isDarkMode 
                        ? 'bg-green-900/20 border-green-800 hover:bg-green-900/30 text-green-200' 
                        : 'bg-green-50 border-green-200 text-green-800'
                    }`}
                  >
                    <FileSpreadsheet className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span className="font-medium">Export as CSV</span>
                  </button>

                  <button
                    onClick={exportToPDF}
                    disabled={!riskGroups}
                    className={`w-full flex items-center gap-3 px-4 py-3 border rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      isDarkMode 
                        ? 'bg-red-900/20 border-red-800 hover:bg-red-900/30 text-red-200' 
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}
                  >
                    <FileTextIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <span className="font-medium">Export as PDF</span>
                  </button>

                  <button
                    onClick={exportToExcel}
                    disabled={!riskGroups}
                    className={`w-full flex items-center gap-3 px-4 py-3 border rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      isDarkMode 
                        ? 'bg-blue-900/20 border-blue-800 hover:bg-blue-900/30 text-blue-200' 
                        : 'bg-blue-50 border-blue-200 text-blue-800'
                    }`}
                  >
                    <FileSpreadsheet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="font-medium">Export as Excel</span>
                  </button>
                </div>
                {!riskGroups && (
                  <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Upload and process a file first to enable exports
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

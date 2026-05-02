"use client";

import { useState, useCallback } from "react";
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-gray-900">TransactScan</span>
        </div>

        <nav className="space-y-2">
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 text-teal-600 bg-teal-50 rounded-lg font-medium"
          >
            <Upload className="w-5 h-5" />
            Upload
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg"
          >
            <History className="w-5 h-5" />
            History
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg"
          >
            <Settings className="w-5 h-5" />
            Settings
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-12">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Import Transactions
              </h1>
              <p className="text-gray-500 mt-1">
                Upload your financial statements in CSV format. Our system will
                automatically parse and categorize your data for
                reconciliation.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">Upload</span>
              <span className="text-sm text-gray-500">History</span>
              <span className="text-sm text-gray-500">Settings</span>
              <div className="w-10 h-6 bg-teal-600 rounded-full relative">
                <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1"></div>
              </div>
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
                  : "border-gray-300 bg-white hover:border-teal-400"
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
                  <p className="text-lg font-medium text-gray-900 mb-1">
                    {uploadedFile.name}
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
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
                  <p className="text-lg font-medium text-gray-900 mb-1">
                    Drag and drop CSV files
                  </p>
                  <p className="text-sm text-gray-500 mb-6">
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
            <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200"></div>
                  <div className="absolute inset-0 rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent animate-spin"></div>
                </div>
                <div>
                  <p className="text-blue-800 font-semibold text-lg">Analyzing Your Transactions</p>
                  <p className="text-blue-600 text-sm">Our AI is scanning for potential risks and anomalies...</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-8 bg-red-50 border border-red-200 rounded-xl p-6">
              <p className="text-red-800 font-medium">Error: {error}</p>
            </div>
          )}

          {/* Results Display */}
          {riskGroups && (
            <div className="mt-12 space-y-8">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <Info className="w-6 h-6 text-blue-600 mt-1" />
                  <div>
                    <h2 className="text-xl font-semibold text-blue-900 mb-2">Risk Analysis Results</h2>
                    <p className="text-blue-800 mb-3">
                      Our system has analyzed your transactions for potential financial risks including money laundering, fraud, and regulatory compliance issues.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-blue-900">Risk Levels:</p>
                        <ul className="text-blue-700 space-y-1 mt-1">
                          <li><span className="font-medium">High Risk (76-100):</span> Requires immediate investigation</li>
                          <li><span className="font-medium">Risky (51-75):</span> Should be monitored closely</li>
                          <li><span className="font-medium">Low Risk (26-50):</span> Review if patterns emerge</li>
                          <li><span className="font-medium">Safe (0-25):</span> No significant concerns detected</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium text-blue-900">Common Risk Factors:</p>
                        <ul className="text-blue-700 space-y-1 mt-1">
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
                <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-xl p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                      <ShieldAlert className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-red-800 text-lg">High Risk</h3>
                  </div>
                  <p className="text-4xl font-bold text-red-600 mb-2">{riskGroups.high_risk.length}</p>
                  <p className="text-sm text-red-600 font-medium">transactions flagged</p>
                  <p className="text-xs text-red-500 mt-3">Requires immediate attention</p>
                </div>
                
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 rounded-xl p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-orange-800 text-lg">Risky</h3>
                  </div>
                  <p className="text-4xl font-bold text-orange-600 mb-2">{riskGroups.risky.length}</p>
                  <p className="text-sm text-orange-600 font-medium">transactions flagged</p>
                  <p className="text-xs text-orange-500 mt-3">Monitor closely</p>
                </div>
                
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-200 rounded-xl p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center">
                      <Info className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-yellow-800 text-lg">Low Risk</h3>
                  </div>
                  <p className="text-4xl font-bold text-yellow-600 mb-2">{riskGroups.low_risk.length}</p>
                  <p className="text-sm text-yellow-600 font-medium">transactions flagged</p>
                  <p className="text-xs text-yellow-500 mt-3">Review if needed</p>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                      <ShieldCheck className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-green-800 text-lg">Safe</h3>
                  </div>
                  <p className="text-4xl font-bold text-green-600 mb-2">{riskGroups.safe.length}</p>
                  <p className="text-sm text-green-600 font-medium">transactions</p>
                  <p className="text-xs text-green-500 mt-3">No concerns detected</p>
                </div>
              </div>

              {/* Transaction Details */}
              {Object.entries(riskGroups).map(([riskLevel, transactions]) => {
                const getRiskColor = (level: string) => {
                  switch (level) {
                    case 'high_risk': return 'border-red-300 bg-red-50';
                    case 'risky': return 'border-orange-300 bg-orange-50';
                    case 'low_risk': return 'border-yellow-300 bg-yellow-50';
                    case 'safe': return 'border-green-300 bg-green-50';
                    default: return 'border-gray-300 bg-gray-50';
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
                        {riskLevel.replace('_', ' ')} Transactions ({transactions.length})
                      </h3>
                    </div>
                    
                    <div className="space-y-8 max-h-96 overflow-y-auto">
                      {transactions.map((tx, index) => (
                        <div key={index} className="bg-white border-2 border-gray-200 rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                          <div className="flex justify-between items-start mb-6">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <FileText className="w-6 h-6 text-gray-500" />
                                <p className="font-bold text-gray-900 text-xl">{tx.name}</p>
                              </div>
                              <div className="flex items-center gap-6 text-base text-gray-700 mb-3">
                                <span className="flex items-center gap-2">
                                  <span className="font-semibold">ID:</span> 
                                  <span className="bg-gray-100 px-2 py-1 rounded text-sm">{tx.transactionID}</span>
                                </span>
                                <span className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-blue-500" />
                                  <span className="font-medium">{tx.country}</span>
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-3xl font-bold text-gray-900 mb-2">
                                ${tx.amount?.toLocaleString() ?? 'N/A'}
                              </p>
                              <div className="flex items-center gap-2 text-base text-gray-600">
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
                                  <p className="text-lg font-bold text-gray-800">🚨 Risk Factors Identified:</p>
                                </div>
                                <div className="space-y-3">
                                  {tx.flags.map((flag, flagIndex) => (
                                    <div key={flagIndex} className="flex items-start gap-3 bg-red-50 border-2 border-red-200 rounded-lg p-4">
                                      {getFlagIcon(flag)}
                                      <p className="text-base font-semibold text-gray-800 leading-relaxed flex-1">{flag}</p>
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
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-blue-900">🏥 Business Health Dashboard</h2>
                    <p className="text-blue-700 text-lg">Holistic analysis of your business financial health</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Revenue Analysis */}
                  <div className="bg-white rounded-xl p-6 shadow-lg">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      💰 Revenue Analysis
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <span className="font-semibold text-green-800">Total Revenue:</span>
                        <span className="text-xl font-bold text-green-600">${businessHealth.revenuePatterns.totalRevenue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <span className="font-semibold text-blue-800">Average Transaction:</span>
                        <span className="text-xl font-bold text-blue-600">${businessHealth.revenuePatterns.averageTransaction.toFixed(2)}</span>
                      </div>
                      <div className={`flex justify-between items-center p-3 rounded-lg ${
                        businessHealth.revenuePatterns.revenueTrend === 'increasing' ? 'bg-green-50' :
                        businessHealth.revenuePatterns.revenueTrend === 'decreasing' ? 'bg-red-50' : 'bg-yellow-50'
                      }`}>
                        <span className="font-semibold">Revenue Trend:</span>
                        <span className={`text-xl font-bold capitalize ${
                          businessHealth.revenuePatterns.revenueTrend === 'increasing' ? 'text-green-600' :
                          businessHealth.revenuePatterns.revenueTrend === 'decreasing' ? 'text-red-600' : 'text-yellow-600'
                        }`}>
                          {businessHealth.revenuePatterns.revenueTrend}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Cash Flow Risk */}
                  <div className="bg-white rounded-xl p-6 shadow-lg">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      💸 Cash Flow Risk Assessment
                    </h3>
                    <div className="space-y-4">
                      <div className={`p-4 rounded-lg border-2 ${
                        businessHealth.cashFlowRisk.riskLevel === 'high' ? 'bg-red-50 border-red-300' :
                        businessHealth.cashFlowRisk.riskLevel === 'medium' ? 'bg-yellow-50 border-yellow-300' :
                        'bg-green-50 border-green-300'
                      }`}>
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
                        <h4 className="font-bold text-gray-800">Predictions:</h4>
                        {businessHealth.cashFlowRisk.predictions.map((prediction, index) => (
                          <p key={index} className="text-gray-700 bg-gray-50 p-2 rounded">• {prediction}</p>
                        ))}
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-bold text-gray-800">Recommendations:</h4>
                        {businessHealth.cashFlowRisk.recommendations.map((rec, index) => (
                          <p key={index} className="text-blue-700 bg-blue-50 p-2 rounded">💡 {rec}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Supplier Analysis */}
                {businessHealth.supplierAnalysis.topSuppliers.length > 0 && (
                  <div className="bg-white rounded-xl p-6 shadow-lg">
                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                      🏪 Top Suppliers Analysis
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {businessHealth.supplierAnalysis.topSuppliers.map((supplier, index) => (
                        <div key={index} className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                          <h4 className="font-bold text-gray-900 mb-2">{supplier.name}</h4>
                          <div className="space-y-1 text-sm">
                            <p className="flex justify-between">
                              <span className="text-gray-600">Total Spent:</span>
                              <span className="font-semibold">${supplier.totalSpent.toFixed(2)}</span>
                            </p>
                            <p className="flex justify-between">
                              <span className="text-gray-600">Transactions:</span>
                              <span className="font-semibold">{supplier.transactionCount}</span>
                            </p>
                            <p className="flex justify-between">
                              <span className="text-gray-600">Reliability:</span>
                              <span className={`font-semibold ${
                                supplier.paymentPattern === 'reliable' ? 'text-green-600' :
                                supplier.paymentPattern === 'irregular' ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {supplier.reliabilityScore.toFixed(2)}/100 ({supplier.paymentPattern})
                              </span>
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

          {/* Supported Data Points */}
          <div className="mt-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                Supported Data Points
              </h2>
              <a
                href="#"
                className="text-sm text-teal-600 hover:text-teal-700"
              >
                View Mapping Guide
              </a>
            </div>

            <div className="grid grid-cols-4 gap-6">
              {dataPoints.map((point) => (
                <div key={point.title} className="bg-white rounded-xl p-4 border border-gray-200">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                    <point.icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1">
                    {point.title}
                  </h3>
                  <p className="text-sm text-gray-500">{point.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

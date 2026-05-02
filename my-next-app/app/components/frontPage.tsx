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
} from "lucide-react";
import { parseTransactionFile } from "./parseTransactions";
import { scoreAndGroup, type RiskGroups } from "./scoreTransactions";

export default function TransactScanUpload() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [riskGroups, setRiskGroups] = useState<RiskGroups | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setRiskGroups(null);

    try {
      const transactions = await parseTransactionFile(file);
      const groups = scoreAndGroup(transactions);
      setRiskGroups(groups);
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
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
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
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <p className="text-blue-800 font-medium">Processing CSV file...</p>
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
            <div className="mt-8 space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Risk Analysis Results</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <h3 className="font-medium text-red-800 mb-2">High Risk</h3>
                  <p className="text-2xl font-bold text-red-600">{riskGroups.high_risk.length}</p>
                  <p className="text-sm text-red-600">transactions</p>
                </div>
                
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                  <h3 className="font-medium text-orange-800 mb-2">Risky</h3>
                  <p className="text-2xl font-bold text-orange-600">{riskGroups.risky.length}</p>
                  <p className="text-sm text-orange-600">transactions</p>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <h3 className="font-medium text-yellow-800 mb-2">Low Risk</h3>
                  <p className="text-2xl font-bold text-yellow-600">{riskGroups.low_risk.length}</p>
                  <p className="text-sm text-yellow-600">transactions</p>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <h3 className="font-medium text-green-800 mb-2">Safe</h3>
                  <p className="text-2xl font-bold text-green-600">{riskGroups.safe.length}</p>
                  <p className="text-sm text-green-600">transactions</p>
                </div>
              </div>

              {/* Transaction Details */}
              {Object.entries(riskGroups).map(([riskLevel, transactions]) => (
                transactions.length > 0 && (
                  <div key={riskLevel} className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 capitalize">
                      {riskLevel.replace('_', ' ')} Transactions ({transactions.length})
                    </h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {transactions.map((tx, index) => (
                        <div key={index} className="border border-gray-100 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium text-gray-900">{tx.name}</p>
                              <p className="text-sm text-gray-500">ID: {tx.transactionID}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-gray-900">
                                ${tx.amount?.toLocaleString() ?? 'N/A'}
                              </p>
                              <p className="text-sm text-gray-500">{tx.country}</p>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <p className="text-sm text-gray-500">
                              {tx.dateTime?.toLocaleString() ?? 'Invalid date'}
                            </p>
                            <div className="text-right">
                              <p className="text-sm font-medium">Score: {tx.score}/100</p>
                              {tx.flags.length > 0 && (
                                <div className="mt-1">
                                  <p className="text-xs text-gray-500">Flags:</p>
                                  <ul className="text-xs text-gray-600">
                                    {tx.flags.map((flag, flagIndex) => (
                                      <li key={flagIndex}>• {flag}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
          )}

          {/* Supported Data Points */}
          <div className="mt-8">
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

            <div className="grid grid-cols-4 gap-4">
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

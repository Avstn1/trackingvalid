import { X } from 'lucide-react-native';
import React from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import WebView from 'react-native-webview';

interface Report {
  id: string;
  content: string;
  month: string;
  year: number;
  type?: 'weekly' | 'monthly' | 'weekly_comparison';
  week_number?: number;
  title?: string;
}

interface ReportViewerModalProps {
  report: Report | null;
  visible: boolean;
  onClose: () => void;
}

export default function ReportViewerModal({ 
  report, 
  visible, 
  onClose
}: ReportViewerModalProps) {
  if (!report) return null;

  const getHeaderTitle = () => {
    switch (report.type) {
      case 'weekly':
        return 'Weekly Report';
      case 'weekly_comparison':
        return 'Weekly Comparison Report';
      case 'monthly':
      default:
        return `Monthly Report`;
    }
  };

  const getSubtitle = () => {
    if (report.type === 'weekly' && report.week_number) {
      return `Week ${report.week_number} - ${report.month} ${report.year}`;
    }
    if (report.type === 'weekly_comparison') {
      return `${report.month} ${report.year}`;
    }
    return `${report.month} ${report.year}`;
  };

  // Dark mode styled HTML content
  const styledHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          line-height: 1.6;
          color: #e5e7eb;
          background: #18181b;
          padding: 16px;
        }
        
        h1 {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 12px;
          color: #f9fafb;
          line-height: 1.3;
        }
        
        h2 {
          font-size: 16px;
          font-weight: 600;
          margin-top: 16px;
          margin-bottom: 10px;
          color: #c4ff85;
          border-bottom: 2px solid #3f3f46;
          padding-bottom: 4px;
        }
        
        h3 {
          font-size: 14px;
          font-weight: 600;
          margin-top: 12px;
          margin-bottom: 8px;
          color: #d1d5db;
        }
        
        p {
          margin-bottom: 10px;
          font-size: 13px;
          color: #d1d5db;
        }
        
        ul, ol {
          margin-bottom: 12px;
          padding-left: 20px;
        }
        
        li {
          margin-bottom: 6px;
          font-size: 13px;
          line-height: 1.5;
          color: #d1d5db;
        }
        
        strong {
          font-weight: 600;
          color: #f9fafb;
        }
        
        em {
          font-style: italic;
          color: #9ca3af;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 12px 0;
          font-size: 11px;
          background: #27272a;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        
        thead {
          background: #3f3f46;
        }
        
        th {
          padding: 8px 4px;
          text-align: left;
          font-weight: 600;
          color: #c4ff85;
          border-bottom: 2px solid #52525b;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        
        td {
          padding: 8px 4px;
          border-bottom: 1px solid #3f3f46;
          font-size: 11px;
          color: #d1d5db;
        }
        
        tbody tr:hover {
          background: #3f3f46;
        }
        
        tbody tr:last-child td {
          border-bottom: 2px solid #52525b;
          font-weight: 600;
          color: #f9fafb;
        }
        
        tbody tr:nth-child(even) {
          background: #2d2d30;
        }
        
        /* Number columns right-aligned */
        td:nth-child(n+2),
        th:nth-child(n+2) {
          text-align: right;
        }
        
        /* First column left aligned */
        td:first-child,
        th:first-child {
          text-align: left;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      ${report.content || '<p style="color: #9ca3af; text-align: center; padding: 20px;">No content available.</p>'}
    </body>
    </html>
  `;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      {/* Backdrop and Modal Container */}
      <Pressable 
        onPress={onClose}
        className="flex-1 bg-black/85 justify-center items-center p-4"
      >
        {/* Modal Content - Pressable prevents backdrop close when tapping inside */}
        <Pressable 
          onPress={(e) => {
            // Prevent backdrop from closing when clicking inside modal
          }}
          className="w-full max-w-4xl h-[90%] bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden border-2 border-lime-400/10"
        >
          {/* Header */}
          <View className="border-b border-zinc-800 px-4 py-4">
            <View className="flex-row items-start justify-between mb-1">
              <View className="flex-1 pr-4">
                <Text 
                  className="text-white text-xl font-bold" 
                  numberOfLines={2}
                >
                  {getHeaderTitle()}
                </Text>
              </View>
              <TouchableOpacity 
                onPress={onClose} 
                className="p-2 -mr-2 -mt-1 rounded-full active:bg-zinc-800"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <Text className="text-sm text-gray-400" numberOfLines={1}>
              {getSubtitle()}
            </Text>
          </View>

          {/* Content */}
          <View className="flex-1">
            <WebView
              originWhitelist={['*']}
              source={{ html: styledHTML }}
              style={{ flex: 1, backgroundColor: '#18181b' }}
              showsVerticalScrollIndicator={true}
              scrollEnabled={true}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.error('WebView error:', nativeEvent);
              }}
            />
          </View>

          {/* Footer */}
          <View className="border-t border-zinc-800 p-4">
            <TouchableOpacity
              onPress={onClose}
              className="bg-lime-400 rounded-lg px-4 py-3 active:bg-lime-500"
            >
              <Text className="text-black text-center font-semibold">Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
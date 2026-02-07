import { COLORS } from '@/constants/design-system';
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

  // Dark mode styled HTML content with green accent
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
          background: #181818;
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
          color: #8bcf68;
          border-bottom: 2px solid #333;
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
          background: #1a1a1a;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        
        thead {
          background: #252525;
        }
        
        th {
          padding: 8px 4px;
          text-align: left;
          font-weight: 600;
          color: #8bcf68;
          border-bottom: 2px solid #333;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        
        td {
          padding: 8px 4px;
          border-bottom: 1px solid #333;
          font-size: 11px;
          color: #d1d5db;
        }
        
        tbody tr:hover {
          background: #252525;
        }
        
        tbody tr:last-child td {
          border-bottom: 2px solid #333;
          font-weight: 600;
          color: #f9fafb;
        }
        
        tbody tr:nth-child(even) {
          background: #1f1f1f;
        }
        
        td:nth-child(n+2),
        th:nth-child(n+2) {
          text-align: right;
        }
        
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
      <Pressable 
        onPress={onClose}
        className="flex-1 justify-center items-center p-4"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
      >
        <Pressable 
          onPress={(e) => {}}
          className="w-full max-w-4xl h-[90%] rounded-3xl overflow-hidden"
          style={{
            backgroundColor: COLORS.surface,
            borderWidth: 1,
            borderColor: COLORS.glassBorder,
            shadowColor: COLORS.primary,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.2,
            shadowRadius: 24,
            elevation: 10,
          }}
        >
          {/* Header */}
          <View 
            className="px-4 py-4"
            style={{ 
              borderBottomWidth: 1, 
              borderBottomColor: COLORS.glassBorder,
              backgroundColor: 'rgba(37, 37, 37, 0.5)',
            }}
          >
            <View className="flex-row items-start justify-between mb-1">
              <View className="flex-1 pr-4">
                <Text 
                  className="text-xl font-bold" 
                  style={{ color: COLORS.textPrimary }}
                  numberOfLines={2}
                >
                  {getHeaderTitle()}
                </Text>
              </View>
              <TouchableOpacity 
                onPress={onClose} 
                className="p-2 -mr-2 -mt-1 rounded-full"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text className="text-sm" style={{ color: COLORS.primary }} numberOfLines={1}>
              {getSubtitle()}
            </Text>
          </View>

          {/* Content */}
          <View className="flex-1">
            <WebView
              originWhitelist={['*']}
              source={{ 
                html: styledHTML,
                baseUrl: ''
              }}
              style={{ flex: 1, backgroundColor: COLORS.background }}
              showsVerticalScrollIndicator={true}
              scrollEnabled={true}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.error('WebView error:', nativeEvent);
              }}
            />
          </View>

          {/* Footer */}
          <View 
            className="p-4"
            style={{ 
              borderTopWidth: 1, 
              borderTopColor: COLORS.glassBorder,
              backgroundColor: 'rgba(37, 37, 37, 0.5)',
            }}
          >
            <TouchableOpacity
              onPress={onClose}
              className="rounded-full px-4 py-3"
              style={{
                backgroundColor: COLORS.primary,
                shadowColor: COLORS.primary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.4,
                shadowRadius: 12,
                elevation: 5,
              }}
            >
              <Text className="text-center font-semibold" style={{ color: COLORS.textPrimary }}>Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
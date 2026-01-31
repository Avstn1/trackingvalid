import { ChevronDown, ChevronUp, Search, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FAQModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSearchQuery?: string;
}

interface FAQItem {
  question: string;
  answer: React.ReactNode;
  section: 'overview' | 'sms-features';
}

interface FAQSection {
  id: string;
  title: string;
  description: string;
}

const faqSections: FAQSection[] = [
  {
    id: 'overview',
    title: 'Overview & Guidelines',
    description: 'Understanding cooldowns, limits, and message rules',
  },
  {
    id: 'sms-features',
    title: 'SMS Features Explained',
    description: 'Auto Nudge, Campaigns, and Mass Messages',
  },
];

// Answer Components
const MessagingTypesAnswer = () => (
  <View className="gap-3">
    <Text style={{ fontSize: 13, color: '#d1d5db', lineHeight: 20 }}>
      Corva offers three ways to message your clients:
    </Text>
    <View className="gap-2">
      <View className="flex-row items-start gap-2">
        <Text style={{ color: '#7dd3fc', marginTop: 2 }}>•</Text>
        <View className="flex-1">
          <Text style={{ fontSize: 13, color: '#d1d5db', lineHeight: 20 }}>
            <Text className="font-semibold" style={{ color: '#7dd3fc' }}>SMS Auto Nudge:</Text> Automatically finds clients who are overdue for a visit and sends them friendly reminders to book again.
          </Text>
        </View>
      </View>
      <View className="flex-row items-start gap-2">
        <Text style={{ color: '#fcd34d', marginTop: 2 }}>•</Text>
        <View className="flex-1">
          <Text style={{ fontSize: 13, color: '#d1d5db', lineHeight: 20 }}>
            <Text className="font-semibold" style={{ color: '#fcd34d' }}>SMS Campaigns:</Text> Perfect for holidays or special promotions. Targets clients who haven't been in recently but are still engaged.
          </Text>
        </View>
      </View>
      <View className="flex-row items-start gap-2">
        <Text style={{ color: '#bef264', marginTop: 2 }}>•</Text>
        <View className="flex-1">
          <Text style={{ fontSize: 13, color: '#d1d5db', lineHeight: 20 }}>
            <Text className="font-semibold" style={{ color: '#bef264' }}>Mass Messages:</Text> Send announcements to ALL your clients, like when you're closed for vacation or have a special event.
          </Text>
        </View>
      </View>
    </View>
  </View>
);

const ClientTypesAnswer = () => (
  <View className="gap-3">
    <Text style={{ fontSize: 13, color: '#d1d5db', lineHeight: 20 }}>
      Corva automatically categorizes your clients based on how often they visit. These categories help the messaging system find the right people to contact:
    </Text>
    <View style={{ backgroundColor: 'rgba(30, 41, 59, 0.4)', borderRadius: 8, padding: 12 }} className="gap-3">
      <View className="gap-1">
        <Text style={{ color: '#bef264', fontSize: 14, fontWeight: '600', marginBottom: 4 }}>Consistent</Text>
        <Text style={{ fontSize: 12, color: '#d1d5db', lineHeight: 18 }}>
          Visits more than once every 1 week and a few days on average (basically your regulars who come frequently)
        </Text>
      </View>
      <View className="gap-1">
        <Text style={{ color: '#fcd34d', fontSize: 14, fontWeight: '600', marginBottom: 4 }}>Semi-Consistent</Text>
        <Text style={{ fontSize: 12, color: '#d1d5db', lineHeight: 18 }}>
          Visits once every 2-3 weeks on average (reliable clients with a steady schedule)
        </Text>
      </View>
      <View className="gap-1">
        <Text style={{ color: '#7dd3fc', fontSize: 14, fontWeight: '600', marginBottom: 4 }}>Easy-Going</Text>
        <Text style={{ fontSize: 12, color: '#d1d5db', lineHeight: 18 }}>
          Visits once every 3-8 weeks on average (casual clients who come when they need to)
        </Text>
      </View>
      <View className="gap-1">
        <Text style={{ color: '#9ca3af', fontSize: 14, fontWeight: '600', marginBottom: 4 }}>Rare</Text>
        <Text style={{ fontSize: 12, color: '#d1d5db', lineHeight: 18 }}>
          Visits less than once every 8 weeks on average (occasional clients)
        </Text>
      </View>
      <View className="gap-1">
        <Text style={{ color: '#d8b4fe', fontSize: 14, fontWeight: '600', marginBottom: 4 }}>New</Text>
        <Text style={{ fontSize: 12, color: '#d1d5db', lineHeight: 18 }}>
          Only visited once so far (we don't know their pattern yet)
        </Text>
      </View>
    </View>
    <Text style={{ fontSize: 12, color: '#9ca3af' }}>
      These categories are calculated automatically based on your client's actual visit history, so they update as their patterns change.
    </Text>
  </View>
);

const ClientSheetsVsSMSAnswer = () => (
  <View className="gap-3">
    <Text style={{ fontSize: 13, color: '#fcd34d', lineHeight: 20 }}>
      <Text className="font-semibold">
        Client Sheets shows ALL your clients, but SMS features use smart algorithms to filter for the most relevant ones.
      </Text>
    </Text>
    <Text style={{ fontSize: 13, color: '#d1d5db', lineHeight: 20 }}>Here's what each SMS feature filters for:</Text>
    <View style={{ backgroundColor: 'rgba(30, 41, 59, 0.4)', borderRadius: 8, padding: 12 }} className="gap-3">
      <View className="gap-2">
        <Text style={{ color: '#7dd3fc', fontSize: 14, fontWeight: '600', marginBottom: 4 }}>SMS Auto Nudge</Text>
        <View className="gap-1">
          <View className="flex-row items-start gap-2">
            <Text style={{ color: '#7dd3fc', fontSize: 14 }}>•</Text>
            <Text className="flex-1" style={{ fontSize: 12, color: '#d1d5db', lineHeight: 18 }}>
              Only includes clients who are at least 14 days overdue based on their visit pattern
            </Text>
          </View>
          <View className="flex-row items-start gap-2">
            <Text style={{ color: '#7dd3fc', fontSize: 14 }}>•</Text>
            <Text className="flex-1" style={{ fontSize: 12, color: '#d1d5db', lineHeight: 18 }}>
              Heavily prioritizes Consistent and Semi-Consistent clients (90% of selections)
            </Text>
          </View>
          <View className="flex-row items-start gap-2">
            <Text style={{ color: '#7dd3fc', fontSize: 14 }}>•</Text>
            <Text className="flex-1" style={{ fontSize: 12, color: '#d1d5db', lineHeight: 18 }}>
              Excludes clients in the 14-day cooldown period
            </Text>
          </View>
          <View className="flex-row items-start gap-2">
            <Text style={{ color: '#7dd3fc', fontSize: 14 }}>•</Text>
            <Text className="flex-1" style={{ fontSize: 12, color: '#d1d5db', lineHeight: 18 }}>
              Skips clients who haven't visited in over 1.5 years
            </Text>
          </View>
        </View>
      </View>
      <View className="gap-2">
        <Text style={{ color: '#fcd34d', fontSize: 14, fontWeight: '600', marginBottom: 4 }}>SMS Campaigns</Text>
        <View className="gap-1">
          <View className="flex-row items-start gap-2">
            <Text style={{ color: '#fcd34d', fontSize: 14 }}>•</Text>
            <Text className="flex-1" style={{ fontSize: 12, color: '#d1d5db', lineHeight: 18 }}>
              Targets clients who are slightly overdue but not gone forever
            </Text>
          </View>
          <View className="flex-row items-start gap-2">
            <Text style={{ color: '#fcd34d', fontSize: 14 }}>•</Text>
            <Text className="flex-1" style={{ fontSize: 12, color: '#d1d5db', lineHeight: 18 }}>
              Uses a two-phase system: priority clients first, then fills gaps if needed
            </Text>
          </View>
          <View className="flex-row items-start gap-2">
            <Text style={{ color: '#fcd34d', fontSize: 14 }}>•</Text>
            <Text className="flex-1" style={{ fontSize: 12, color: '#d1d5db', lineHeight: 18 }}>
              Excludes clients in the 7-day cooldown period
            </Text>
          </View>
          <View className="flex-row items-start gap-2">
            <Text style={{ color: '#fcd34d', fontSize: 14 }}>•</Text>
            <Text className="flex-1" style={{ fontSize: 12, color: '#d1d5db', lineHeight: 18 }}>
              Focuses on clients who visited within the last 4 months
            </Text>
          </View>
        </View>
      </View>
      <View className="gap-2">
        <Text style={{ color: '#bef264', fontSize: 14, fontWeight: '600', marginBottom: 4 }}>Mass Messages</Text>
        <View className="gap-1">
          <View className="flex-row items-start gap-2">
            <Text style={{ color: '#bef264', fontSize: 14 }}>•</Text>
            <Text className="flex-1" style={{ fontSize: 12, color: '#d1d5db', lineHeight: 18 }}>
              Includes ALL clients with valid phone numbers
            </Text>
          </View>
          <View className="flex-row items-start gap-2">
            <Text style={{ color: '#bef264', fontSize: 14 }}>•</Text>
            <Text className="flex-1" style={{ fontSize: 12, color: '#d1d5db', lineHeight: 18 }}>
              Only requires at least one visit in history
            </Text>
          </View>
          <View className="flex-row items-start gap-2">
            <Text style={{ color: '#bef264', fontSize: 14 }}>•</Text>
            <Text className="flex-1" style={{ fontSize: 12, color: '#d1d5db', lineHeight: 18 }}>
              Excludes clients in the 15-day cooldown period
            </Text>
          </View>
          <View className="flex-row items-start gap-2">
            <Text style={{ color: '#bef264', fontSize: 14 }}>•</Text>
            <Text className="flex-1" style={{ fontSize: 12, color: '#d1d5db', lineHeight: 18 }}>
              This is the closest to your total Client Sheets count
            </Text>
          </View>
        </View>
      </View>
    </View>
    <View style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.2)', borderRadius: 8, padding: 12, marginTop: 12 }}>
      <Text style={{ fontSize: 12, color: '#d1d5db', lineHeight: 18 }}>
        <Text className="font-semibold">Bottom line:</Text> The algorithms filter out clients who either don't have phone numbers, are in cooldown, unsubscribed, or don't fit the targeting criteria for that specific message type. This ensures you're messaging the right people at the right time!
      </Text>
    </View>
  </View>
);

const CooldownsAnswer = () => (
  <View className="gap-3">
    <Text style={{ fontSize: 13, color: '#fdba74', lineHeight: 20 }}>
      <Text className="font-semibold">Corva has built-in cooldowns to prevent annoying your clients with too many messages.</Text>
    </Text>
    <View style={{ backgroundColor: 'rgba(30, 41, 59, 0.4)', borderRadius: 8, padding: 12 }} className="gap-3">
      <View className="gap-1">
        <Text style={{ color: '#7dd3fc', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Auto Nudge Cooldown: 14 days</Text>
        <Text style={{ fontSize: 12, color: '#d1d5db', lineHeight: 18 }}>
          After a client receives an Auto Nudge, they won't get another one for at least 14 days, even if they're still overdue.
        </Text>
      </View>
      <View className="gap-1">
        <Text style={{ color: '#fcd34d', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Campaign Cooldown: 7 days</Text>
        <Text style={{ fontSize: 12, color: '#d1d5db', lineHeight: 18 }}>
          Campaigns wait 7 days after the last message before including a client again.
        </Text>
      </View>
      <View className="gap-1">
        <Text style={{ color: '#bef264', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Mass Message Cooldown: 15 days (lenient phase)</Text>
        <Text style={{ fontSize: 12, color: '#d1d5db', lineHeight: 18 }}>
          Mass messages have the longest cooldown since they go to everyone.
        </Text>
      </View>
    </View>
    <Text style={{ fontSize: 12, color: '#9ca3af' }}>
      These cooldowns protect your reputation and prevent clients from feeling spammed!
    </Text>
  </View>
);

const FewerClientsAnswer = () => (
  <View className="gap-3">
    <Text style={{ fontSize: 13, color: '#d1d5db', lineHeight: 20 }}>
      There are several reasons you might see fewer eligible clients:
    </Text>
    <View className="gap-2">
      <View className="flex-row items-start gap-2">
        <Text style={{ color: '#fdba74', fontWeight: '600' }}>1.</Text>
        <View className="flex-1">
          <Text style={{ fontSize: 13, color: '#d1d5db', lineHeight: 20 }}>
            <Text className="font-semibold">Recent Messages:</Text> Clients messaged recently are in cooldown period
          </Text>
        </View>
      </View>
      <View className="flex-row items-start gap-2">
        <Text style={{ color: '#fdba74', fontWeight: '600' }}>2.</Text>
        <View className="flex-1">
          <Text style={{ fontSize: 13, color: '#d1d5db', lineHeight: 20 }}>
            <Text className="font-semibold">Visit Timing:</Text> Clients might not be overdue enough yet (Auto Nudge needs 14+ days overdue)
          </Text>
        </View>
      </View>
      <View className="flex-row items-start gap-2">
        <Text style={{ color: '#fdba74', fontWeight: '600' }}>3.</Text>
        <View className="flex-1">
          <Text style={{ fontSize: 13, color: '#d1d5db', lineHeight: 20 }}>
            <Text className="font-semibold">Visit Patterns:</Text> Clients might visit too frequently or too rarely to qualify
          </Text>
        </View>
      </View>
      <View className="flex-row items-start gap-2">
        <Text style={{ color: '#fdba74', fontWeight: '600' }}>4.</Text>
        <View className="flex-1">
          <Text style={{ fontSize: 13, color: '#d1d5db', lineHeight: 20 }}>
            <Text className="font-semibold">Phone Numbers:</Text> Some clients might not have valid phone numbers on file
          </Text>
        </View>
      </View>
      <View className="flex-row items-start gap-2">
        <Text style={{ color: '#fdba74', fontWeight: '600' }}>5.</Text>
        <View className="flex-1">
          <Text style={{ fontSize: 13, color: '#d1d5db', lineHeight: 20 }}>
            <Text className="font-semibold">Unsubscribed:</Text> Clients who opted out won't appear
          </Text>
        </View>
      </View>
    </View>
    <View style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.2)', borderRadius: 8, padding: 12, marginTop: 12 }}>
      <Text style={{ fontSize: 12, color: '#d1d5db', lineHeight: 18 }}>
        <Text className="font-semibold">Pro tip:</Text> Check your message history to see when clients last received a message!
      </Text>
    </View>
  </View>
);

const ScheduleLockedAnswer = () => (
  <View className="gap-3">
    <Text style={{ fontSize: 13, color: '#fcd34d', lineHeight: 20 }}>
      <Text className="font-semibold">Auto Nudge schedules lock until the 1st of the next month</Text> after you activate them. This prevents accidental spam.
    </Text>
    <Text style={{ fontSize: 13, color: '#d1d5db', lineHeight: 20 }}>Here's why:</Text>
    <View className="gap-2">
      <View className="flex-row items-start gap-2">
        <Text style={{ color: '#7dd3fc' }}>•</Text>
        <Text className="flex-1" style={{ fontSize: 13, color: '#d1d5db', lineHeight: 20 }}>
          Auto Nudge runs automatically based on your schedule
        </Text>
      </View>
      <View className="flex-row items-start gap-2">
        <Text style={{ color: '#7dd3fc' }}>•</Text>
        <Text className="flex-1" style={{ fontSize: 13, color: '#d1d5db', lineHeight: 20 }}>
          If you could change it anytime, you might accidentally message the same clients twice
        </Text>
      </View>
      <View className="flex-row items-start gap-2">
        <Text style={{ color: '#7dd3fc' }}>•</Text>
        <Text className="flex-1" style={{ fontSize: 13, color: '#d1d5db', lineHeight: 20 }}>
          The lock resets on the 1st of each month so you can adjust for the new month
        </Text>
      </View>
    </View>
    <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 12 }}>
      <Text style={{ fontStyle: 'italic' }}>Tip: Plan your Auto Nudge schedule carefully at the beginning of the month!</Text>
    </Text>
  </View>
);

const MessageLifecycleAnswer = () => (
  <View className="gap-3">
    <Text style={{ fontSize: 13, color: '#fcd34d', lineHeight: 20 }}>
      <Text className="font-semibold">Campaign and Mass messages are one-time use only.</Text>
    </Text>
    <Text style={{ fontSize: 13, color: '#d1d5db', lineHeight: 20 }}>Here's what happens:</Text>
    <View className="gap-2">
      <View className="flex-row items-start gap-2">
        <Text style={{ color: '#fcd34d' }}>•</Text>
        <Text className="flex-1" style={{ fontSize: 13, color: '#d1d5db', lineHeight: 20 }}>
          Once sent, you can't reuse the same message
        </Text>
      </View>
      <View className="flex-row items-start gap-2">
        <Text style={{ color: '#fcd34d' }}>•</Text>
        <Text className="flex-1" style={{ fontSize: 13, color: '#d1d5db', lineHeight: 20 }}>
          When you delete it, it's "soft deleted" - removed from your active list
        </Text>
      </View>
      <View className="flex-row items-start gap-2">
        <Text style={{ color: '#fcd34d' }}>•</Text>
        <Text className="flex-1" style={{ fontSize: 13, color: '#d1d5db', lineHeight: 20 }}>
          You can still see it in your message history for record-keeping
        </Text>
      </View>
      <View className="flex-row items-start gap-2">
        <Text style={{ color: '#fcd34d' }}>•</Text>
        <Text className="flex-1" style={{ fontSize: 13, color: '#d1d5db', lineHeight: 20 }}>
          Want another campaign or mass message? Just create a new one!
        </Text>
      </View>
    </View>
    <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 12 }}>
      This keeps your messages organized and prevents confusion about which messages are active.
    </Text>
  </View>
);

const AutoNudgeAlgorithmAnswer = () => (
  <View className="gap-3">
    <Text style={{ fontSize: 13, color: '#d1d5db', lineHeight: 20 }}>
      Auto Nudge is smart about finding clients who are most likely to book again. Here's how it works:
    </Text>
    <View className="gap-2">
      <View className="flex-row items-start gap-2">
        <Text style={{ color: '#7dd3fc' }}>•</Text>
        <Text className="flex-1" style={{ fontSize: 13, color: '#d1d5db', lineHeight: 20 }}>
          It looks at each client's visit pattern (how often they usually come in)
        </Text>
      </View>
      <View className="flex-row items-start gap-2">
        <Text style={{ color: '#7dd3fc' }}>•</Text>
        <Text className="flex-1" style={{ fontSize: 13, color: '#d1d5db', lineHeight: 20 }}>
          Calculates how many days "overdue" they are based on their usual schedule
        </Text>
      </View>
      <View className="flex-row items-start gap-2">
        <Text style={{ color: '#7dd3fc' }}>•</Text>
        <Text className="flex-1" style={{ fontSize: 13, color: '#d1d5db', lineHeight: 20 }}>
          Only messages clients who are at least <Text className="font-semibold">14 days overdue</Text>
        </Text>
      </View>
      <View className="flex-row items-start gap-2">
        <Text style={{ color: '#7dd3fc' }}>•</Text>
        <Text className="flex-1" style={{ fontSize: 13, color: '#d1d5db', lineHeight: 20 }}>
          Heavily prioritizes your "consistent" and "semi-consistent" clients (90% of messages go to them)
        </Text>
      </View>
    </View>
    <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 12 }}>
      <Text style={{ fontStyle: 'italic' }}>Example: If John usually comes every 4 weeks and it's been 6 weeks, he's 2 weeks overdue and eligible for a nudge.</Text>
    </Text>
  </View>
);

const AutoNudgeClientTypesAnswer = () => (
  <View className="gap-3">
    <Text style={{ fontSize: 13, color: '#d1d5db', lineHeight: 20 }}>
      Auto Nudge focuses on your most reliable clients and tries to prioritize them whenever possible:
    </Text>
    <View className="gap-2">
      <View className="flex-row items-start gap-2">
        <Text style={{ color: '#86efac' }}>✓</Text>
        <View className="flex-1">
          <Text style={{ fontSize: 13, color: '#d1d5db', lineHeight: 20 }}>
            <Text className="font-semibold" style={{ color: '#bef264' }}>Consistent clients</Text> - Come in regularly (more than once every 1 week and a few days on average)
          </Text>
        </View>
      </View>
      <View className="flex-row items-start gap-2">
        <Text style={{ color: '#86efac' }}>✓</Text>
        <View className="flex-1">
          <Text style={{ fontSize: 13, color: '#d1d5db', lineHeight: 20 }}>
            <Text className="font-semibold" style={{ color: '#fcd34d' }}>Semi-consistent clients</Text> - Come in fairly regularly (every 2-3 weeks on average)
          </Text>
        </View>
      </View>
      <View className="flex-row items-start gap-2">
        <Text style={{ color: '#fde047' }}>~</Text>
        <View className="flex-1">
          <Text style={{ fontSize: 13, color: '#d1d5db', lineHeight: 20 }}>
            <Text className="font-semibold" style={{ color: '#d1d5db' }}>Easy-going & Rare clients</Text> - May get messages if there aren't enough consistent/semi-consistent clients available
          </Text>
        </View>
      </View>
    </View>
    <View style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.2)', borderRadius: 8, padding: 12, marginTop: 12 }}>
      <Text style={{ fontSize: 12, color: '#d1d5db', lineHeight: 18 }}>
        <Text className="font-semibold">How it works:</Text> The system tries to fill 90% of Auto Nudge messages with Consistent and Semi-Consistent clients when possible. If there aren't enough of them available (due to cooldowns or visit timing), it will include Easy-Going and Rare clients to reach your target number.
      </Text>
    </View>
    <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 12 }}>
      The system skips clients who haven't visited in too long - they're better for Campaigns instead.
    </Text>
  </View>
);

const CampaignAlgorithmAnswer = () => (
  <View className="gap-3">
    <Text style={{ fontSize: 13, color: '#d1d5db', lineHeight: 20 }}>
      Campaigns use a two-phase approach to find the best clients for your promotion:
    </Text>
    <View style={{ backgroundColor: 'rgba(30, 41, 59, 0.4)', borderRadius: 8, padding: 12 }} className="gap-3">
      <View className="gap-2">
        <Text style={{ color: '#fcd34d', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Phase 1: High-Priority Clients</Text>
        <View className="gap-1">
          <View className="flex-row items-start gap-2">
            <Text style={{ color: '#fcd34d', fontSize: 14 }}>•</Text>
            <Text className="flex-1" style={{ fontSize: 12, color: '#d1d5db', lineHeight: 18 }}>
              Clients who are a bit overdue but not gone forever
            </Text>
          </View>
          <View className="flex-row items-start gap-2">
            <Text style={{ color: '#fcd34d', fontSize: 14 }}>•</Text>
            <Text className="flex-1" style={{ fontSize: 12, color: '#d1d5db', lineHeight: 18 }}>
              Consistent clients: 0-45 days overdue
            </Text>
          </View>
          <View className="flex-row items-start gap-2">
            <Text style={{ color: '#fcd34d', fontSize: 14 }}>•</Text>
            <Text className="flex-1" style={{ fontSize: 12, color: '#d1d5db', lineHeight: 18 }}>
              Semi-consistent: 0-30 days overdue
            </Text>
          </View>
          <View className="flex-row items-start gap-2">
            <Text style={{ color: '#fcd34d', fontSize: 14 }}>•</Text>
            <Text className="flex-1" style={{ fontSize: 12, color: '#d1d5db', lineHeight: 18 }}>
              New clients: 21-60 days since their first visit
            </Text>
          </View>
        </View>
      </View>
      <View className="gap-2">
        <Text style={{ color: '#7dd3fc', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Phase 2: Fill the Gaps</Text>
        <Text style={{ fontSize: 12, color: '#d1d5db', lineHeight: 18 }}>
          If Phase 1 doesn't find enough people, we'll add more clients who are slightly more overdue (up to 120 days), giving you a fuller list for your campaign.
        </Text>
      </View>
    </View>
    <Text style={{ fontSize: 12, color: '#9ca3af' }}>
      Campaigns are perfect for bringing back clients who might have forgotten about you!
    </Text>
  </View>
);

const MassMessageAlgorithmAnswer = () => (
  <View className="gap-3">
    <Text style={{ fontSize: 13, color: '#d1d5db', lineHeight: 20 }}>
      Mass Messages are the simplest - they go to <Text className="font-semibold" style={{ color: '#bef264' }}>EVERYONE!</Text>
    </Text>
    <Text style={{ fontSize: 13, color: '#d1d5db', lineHeight: 20 }}>Here's who gets included:</Text>
    <View className="gap-2">
      <View className="flex-row items-start gap-2">
        <Text style={{ color: '#bef264' }}>•</Text>
        <Text className="flex-1" style={{ fontSize: 13, color: '#d1d5db', lineHeight: 20 }}>
          All clients with a phone number
        </Text>
      </View>
      <View className="flex-row items-start gap-2">
        <Text style={{ color: '#bef264' }}>•</Text>
        <Text className="flex-1" style={{ fontSize: 13, color: '#d1d5db', lineHeight: 20 }}>
          Who have visited at least once
        </Text>
      </View>
      <View className="flex-row items-start gap-2">
        <Text style={{ color: '#bef264' }}>•</Text>
        <Text className="flex-1" style={{ fontSize: 13, color: '#d1d5db', lineHeight: 20 }}>
          Haven't unsubscribed from messages
        </Text>
      </View>
    </View>
    <View style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)', borderWidth: 1, borderColor: 'rgba(234, 179, 8, 0.2)', borderRadius: 8, padding: 12, marginTop: 12 }}>
      <Text style={{ fontSize: 12, color: '#d1d5db', lineHeight: 18 }}>
        <Text className="font-semibold" style={{ color: '#fcd34d' }}>Important:</Text> Mass messages don't filter by visit recency. Use these sparingly for important announcements only!
      </Text>
    </View>
  </View>
);

const MassVsCampaignAnswer = () => (
  <View className="gap-3">
    <View style={{ backgroundColor: 'rgba(132, 204, 22, 0.1)', borderWidth: 1, borderColor: 'rgba(132, 204, 22, 0.2)', borderRadius: 8, padding: 12 }}>
      <Text style={{ color: '#bef264', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Use Mass Messages for:</Text>
      <View className="gap-1">
        <Text style={{ fontSize: 12, color: '#d1d5db', lineHeight: 18 }}>• Shop closures or schedule changes</Text>
        <Text style={{ fontSize: 12, color: '#d1d5db', lineHeight: 18 }}>• Important announcements everyone needs to know</Text>
        <Text style={{ fontSize: 12, color: '#d1d5db', lineHeight: 18 }}>• Special events at your shop</Text>
        <Text style={{ fontSize: 12, color: '#d1d5db', lineHeight: 18 }}>• Holiday greetings to all clients</Text>
      </View>
    </View>
    <View style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.2)', borderRadius: 8, padding: 12 }}>
      <Text style={{ color: '#fcd34d', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Use Campaigns for:</Text>
      <View className="gap-1">
        <Text style={{ fontSize: 12, color: '#d1d5db', lineHeight: 18 }}>• Promotional offers or discounts</Text>
        <Text style={{ fontSize: 12, color: '#d1d5db', lineHeight: 18 }}>• Bringing back clients who haven't been in</Text>
        <Text style={{ fontSize: 12, color: '#d1d5db', lineHeight: 18 }}>• Seasonal promotions</Text>
        <Text style={{ fontSize: 12, color: '#d1d5db', lineHeight: 18 }}>• New service announcements</Text>
      </View>
    </View>
  </View>
);

const faqs: FAQItem[] = [
  // OVERVIEW SECTION
  {
    question: "What are the different messaging types in Corva?",
    answer: <MessagingTypesAnswer />,
    section: 'overview',
  },
  {
    question: "What are the different Client Types?",
    answer: <ClientTypesAnswer />,
    section: 'overview',
  },
  {
    question: "Why are my Client Sheets total clients way bigger than my SMS clients?",
    answer: <ClientSheetsVsSMSAnswer />,
    section: 'overview',
  },
  {
    question: "Why can't I message some clients even though they seem eligible?",
    answer: <CooldownsAnswer />,
    section: 'overview',
  },
  {
    question: "Why am I seeing fewer clients than expected?",
    answer: <FewerClientsAnswer />,
    section: 'overview',
  },
  {
    question: "Why is my Auto Nudge schedule locked?",
    answer: <ScheduleLockedAnswer />,
    section: 'overview',
  },
  {
    question: "What happens to Campaign and Mass messages after I send them?",
    answer: <MessageLifecycleAnswer />,
    section: 'overview',
  },
  // SMS FEATURES SECTION
  {
    question: "How does SMS Auto Nudge decide who to message?",
    answer: <AutoNudgeAlgorithmAnswer />,
    section: 'sms-features',
  },
  {
    question: "What client types get Auto Nudge messages?",
    answer: <AutoNudgeClientTypesAnswer />,
    section: 'sms-features',
  },
  {
    question: "How does SMS Campaigns decide who to message?",
    answer: <CampaignAlgorithmAnswer />,
    section: 'sms-features',
  },
  {
    question: "How does Mass Messages decide who to message?",
    answer: <MassMessageAlgorithmAnswer />,
    section: 'sms-features',
  },
  {
    question: "When should I use Mass Messages vs Campaigns?",
    answer: <MassVsCampaignAnswer />,
    section: 'sms-features',
  },
];

export default function FAQModal({ isOpen, onClose, initialSearchQuery }: FAQModalProps) {
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get('window').height;
  const modalHeight = screenHeight * 0.85;
  
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [isClosing, setIsClosing] = useState(false);

  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  // Animate modal open
  useEffect(() => {
    if (isOpen) {
      translateY.value = modalHeight;
      opacity.value = 0;
      translateY.value = withTiming(0, { duration: 300 });
      opacity.value = withTiming(1, { duration: 300 });
    }
  }, [isOpen, translateY, opacity, modalHeight]);

  const closeModal = () => {
    if (isClosing) return;
    setIsClosing(true);
    translateY.value = withTiming(modalHeight, { duration: 300 });
    opacity.value = withTiming(0, { duration: 300 });
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      translateY.value = 0;
    }, 300);
  };

  // Pan gesture for swipe down on handle only
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
        const progress = Math.min(event.translationY / 300, 1);
        opacity.value = 1 - progress * 0.5;
      }
    })
    .onEnd((event) => {
      if (event.translationY > 100 || event.velocityY > 500) {
        runOnJS(closeModal)();
      } else {
        translateY.value = withTiming(0, { duration: 200 });
        opacity.value = withTiming(1, { duration: 200 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  useEffect(() => {
    if (isOpen && initialSearchQuery) {
      setSearchKeyword(initialSearchQuery);
      setExpandedQuestion(0);
    }
  }, [isOpen, initialSearchQuery]);

  const extractText = (content: React.ReactNode): string => {
    if (typeof content === 'string') return content;
    
    const getText = (element: any): string => {
      if (!element) return '';
      if (typeof element === 'string') return element;
      if (typeof element === 'number') return String(element);
      if (Array.isArray(element)) return element.map(getText).join(' ');
      if (element.props?.children) return getText(element.props.children);
      return '';
    };
    
    return getText(content);
  };

  const searchFilteredFaqs = searchKeyword.trim()
    ? faqs.filter((faq) => {
        const keyword = searchKeyword.toLowerCase();
        const questionMatch = faq.question.toLowerCase().includes(keyword);
        const answerText = extractText(faq.answer).toLowerCase();
        const answerMatch = answerText.includes(keyword);
        return questionMatch || answerMatch;
      })
    : null;

  const displayedFaqs = searchFilteredFaqs || faqs.filter((f) => f.section === activeSection);

  if (!isOpen) return null;

  return (
    <Modal animationType="none" transparent={true} visible={isOpen} onRequestClose={closeModal}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[{ flex: 1 }, backdropStyle]}>
          <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
            <Pressable className="flex-1" onPress={closeModal} />
            <Animated.View
              style={[
                animatedStyle,
                {
                  backgroundColor: '#1a1f1b',
                  borderTopWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  height: modalHeight,
                },
              ]}
              className="rounded-t-3xl"
            >
              {/* Swipe Handle + Header - draggable area */}
              <GestureDetector gesture={panGesture}>
                 <View style={{ backgroundColor: 'rgba(51, 65, 85, 0.3)' }}>
                  {/* Swipe Handle */}
                  <View className="items-center py-3">
                    <View
                      style={{
                        width: 40,
                        height: 4,
                        backgroundColor: '#bdbdbd',
                        borderRadius: 2,
                        opacity: 0.3,
                      }}
                    />
                  </View>

                  {/* Header */}
                  <View
                    style={{ 
                      borderBottomWidth: 1, 
                      borderBottomColor: 'rgba(255, 255, 255, 0.1)',
                      paddingHorizontal: 24,
                      paddingBottom: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <View className="flex-1 pr-4">
                      <Text className="text-2xl font-bold text-gray-200">
                        Frequently Asked Questions
                      </Text>
                      <Text className="text-sm text-gray-400 mt-1">
                        Everything you need to know about messaging your clients
                      </Text>
                    </View>
                    <TouchableOpacity onPress={closeModal} className="p-2">
                      <X size={24} color="#9ca3af" />
                    </TouchableOpacity>
                  </View>
                </View>
              </GestureDetector>

              {/* Search Bar */}
              <View 
                style={{
                  borderBottomWidth: 1,
                  borderBottomColor: 'rgba(255, 255, 255, 0.1)',
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  padding: 12,
                }}
              >
                <View 
                  style={{
                    position: 'relative',
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                  }}
                >
                  <Search color="#9ca3af" size={16} />
                  <TextInput
                    value={searchKeyword}
                    onChangeText={(text) => {
                      setSearchKeyword(text);
                      setExpandedQuestion(null);
                    }}
                    placeholder="Search all questions and answers..."
                    placeholderTextColor="#6b7280"
                    className="flex-1 py-2 px-2 text-sm text-white"
                  />
                  {searchKeyword && (
                    <TouchableOpacity
                      onPress={() => {
                        setSearchKeyword('');
                        setExpandedQuestion(null);
                      }}
                      className="p-1"
                    >
                      <X color="#9ca3af" size={14} />
                    </TouchableOpacity>
                  )}
                </View>
                {searchKeyword && (
                  <Text className="text-xs text-gray-400 mt-1.5 ml-1">
                    Searching across all sections • Found {displayedFaqs.length} result{displayedFaqs.length !== 1 ? 's' : ''}
                  </Text>
                )}
              </View>

              {/* Section Tabs */}
              {!searchKeyword && (
                <View 
                  style={{
                    borderBottomWidth: 1,
                    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  }}
                >
                  <View className="flex-row gap-2 p-3">
                    {faqSections.map((section) => (
                      <TouchableOpacity
                        key={section.id}
                        onPress={() => {
                          setActiveSection(section.id);
                          setExpandedQuestion(null);
                        }}
                        style={{
                          flex: 1,
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          borderRadius: 8,
                          backgroundColor: activeSection === section.id ? '#475569' : 'rgba(255, 255, 255, 0.05)',
                        }}
                      >
                        <Text className={`text-sm font-semibold text-center ${
                          activeSection === section.id ? 'text-white' : 'text-gray-400'
                        }`}>
                          {section.title}
                        </Text>
                        <Text className={`text-xs text-center mt-0.5 ${
                          activeSection === section.id ? 'text-white/80' : 'text-gray-500'
                        }`}>
                          {section.description}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Content */}
              <ScrollView
                className="flex-1 px-6"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 20, 20), paddingTop: 24 }}
              >
                {displayedFaqs.length === 0 ? (
                  <View className="items-center py-12">
                    <Text className="text-sm text-gray-400">
                      No questions found matching "{searchKeyword}"
                    </Text>
                    <TouchableOpacity onPress={() => setSearchKeyword('')}>
                      <Text className="mt-3 text-xs text-emerald-400 underline">
                        Clear search
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View className="gap-3">
                    {displayedFaqs.map((faq, index) => (
                      <View
                        key={index}
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          borderWidth: 1,
                          borderColor: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: 8,
                          overflow: 'hidden',
                        }}
                      >
                        <TouchableOpacity
                          onPress={() => setExpandedQuestion(expandedQuestion === index ? null : index)}
                          className="p-4 flex-row items-start justify-between gap-2"
                        >
                          <Text className="flex-1 font-semibold text-white text-sm leading-snug">
                            {faq.question}
                          </Text>
                          {expandedQuestion === index ? (
                            <ChevronUp color="#9ca3af" size={20} />
                          ) : (
                            <ChevronDown color="#9ca3af" size={20} />
                          )}
                        </TouchableOpacity>

                        {expandedQuestion === index && (
                          <View className="px-4 pb-4 border-t border-white/10 pt-4">
                            {faq.answer}
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            </Animated.View>
          </View>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}
'use client';

import React, { useState } from 'react';
import {
  Briefcase,
  Send,
  Plus,
  Trash2,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Layers,
  ArrowRight,
  ShieldCheck,
  Key,
  Webhook,
  FileCode2,
  Bot,
  MessageSquare,
  Zap,
  CheckCircle2,
  ChevronDown,
  Terminal,
} from 'lucide-react';
import { toast } from 'sonner';
import { businessStore } from '@/lib/business/businessStore';
import { calculateMessageSavings } from '@/lib/business/costLedger';
import { renderTemplate } from '@/lib/business/templateEngine';
import { simulateBusinessAiCustomerSupport } from '@/lib/ai/deltaAiEngine';
import { useMessaging } from '@/context/MessagingContext';
import {
  BusinessCategory,
  WhatsAppCompatibleSendMessageRequest,
} from '@/types/business';

export function DeltaBusinessHub() {
  const { conversations, sendBusinessApiMessage, setActiveConversationId, setActiveTab } = useMessaging();

  // Active view inside Delta Business
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'send' | 'templates' | 'api' | 'ai'>('overview');

  // Business state from store
  const [profile, setProfile] = useState(businessStore.getProfile());
  const [templates, setTemplates] = useState(businessStore.getTemplates());
  const [apiKeys, setApiKeys] = useState(businessStore.getApiKeys());
  const [webhookConfig, setWebhookConfig] = useState(businessStore.getWebhookConfig());
  const [savingsMetrics, setSavingsMetrics] = useState(businessStore.getCumulativeSavings());
  const [ledger, setLedger] = useState(businessStore.getLedger());

  // Copied state
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Send / Playground state
  const [targetContact, setTargetContact] = useState<string>('+919876543210');
  const [selectedMessageType, setSelectedMessageType] = useState<'template' | 'text' | 'interactive'>('template');
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>('order_dispatched');
  const [templateParam1, setTemplateParam1] = useState<string>('Priya');
  const [templateParam2, setTemplateParam2] = useState<string>('DLT-98421');
  const [templateParam3, setTemplateParam3] = useState<string>('Today by 6:00 PM');
  const [customTextMessage, setCustomTextMessage] = useState<string>('Hello! Your order has been confirmed with Delta Business.');
  const [interactiveButton1, setInteractiveButton1] = useState<string>('Confirm Order');
  const [interactiveButton2, setInteractiveButton2] = useState<string>('Support');
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [lastApiResponse, setLastApiResponse] = useState<any>(null);
  const [showRawJson, setShowRawJson] = useState<boolean>(false);

  // Template creation state
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState<BusinessCategory>('UTILITY');
  const [newTemplateHeader, setNewTemplateHeader] = useState('');
  const [newTemplateBody, setNewTemplateBody] = useState('Hi {{1}}, thank you for choosing our service. Reference: {{2}}.');
  const [newTemplateFooter, setNewTemplateFooter] = useState('');
  const [newTemplateButtonText, setNewTemplateButtonText] = useState('');
  const [newTemplateButtonUrl, setNewTemplateButtonUrl] = useState('');

  // API Key creation state
  const [newKeyName, setNewKeyName] = useState('');
  const [isCreatingKey, setIsCreatingKey] = useState(false);

  // Webhook test ping state
  const [isPingingWebhook, setIsPingingWebhook] = useState(false);

  // Code snippet language tab
  const [codeTab, setCodeTab] = useState<'curl' | 'node'>('curl');

  // AI Agent Studio state
  const [botName, setBotName] = useState('Delta Concierge');
  const [botPersona, setBotPersona] = useState<'friendly' | 'professional' | 'tanglish'>('friendly');
  const [botAutoPilot, setBotAutoPilot] = useState(true);
  const [botWelcomeMsg, setBotWelcomeMsg] = useState('Hello! Welcome to Delta Store. How can I assist you today?');
  const [knowledgeFaqs, setKnowledgeFaqs] = useState([
    { id: 'faq-1', question: 'What is your delivery timeframe?', answer: 'Orders placed before 2 PM are delivered the same day. Standard delivery takes 24-48 hours.' },
    { id: 'faq-2', question: 'How do returns work?', answer: 'We offer a 7-day hassle-free return policy. Refunds are credited within 24 hours.' },
    { id: 'faq-3', question: 'Where is your store located?', answer: 'Our flagship store is open daily from 10 AM to 9 PM.' },
  ]);
  const [newFaqQuestion, setNewFaqQuestion] = useState('');
  const [newFaqAnswer, setNewFaqAnswer] = useState('');
  const [sandboxMessages, setSandboxMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string }>>([
    { sender: 'bot', text: 'Hello! 👋 I am your automated customer support assistant. How can I help you today?', time: 'Just now' }
  ]);
  const [sandboxInput, setSandboxInput] = useState('What is your delivery timeframe?');
  const [isSandboxThinking, setIsSandboxThinking] = useState(false);

  const refreshState = () => {
    setProfile(businessStore.getProfile());
    setTemplates(businessStore.getTemplates());
    setApiKeys(businessStore.getApiKeys());
    setWebhookConfig(businessStore.getWebhookConfig());
    setSavingsMetrics(businessStore.getCumulativeSavings());
    setLedger(businessStore.getLedger());
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Send Message Handler
  const handleDispatchMessage = async () => {
    setIsDispatching(true);
    setLastApiResponse(null);

    try {
      let displayContent = '';
      let interactiveMeta: any = null;

      if (selectedMessageType === 'template') {
        const tmpl = businessStore.getTemplateByName(selectedTemplateName);
        if (!tmpl) {
          toast.error('Selected template not found');
          setIsDispatching(false);
          return;
        }

        const components = [
          {
            type: 'body' as const,
            parameters: [
              { type: 'text' as const, text: templateParam1 },
              { type: 'text' as const, text: templateParam2 },
              { type: 'text' as const, text: templateParam3 },
            ],
          },
        ];

        const rendered = renderTemplate(tmpl, components as any);
        displayContent = rendered.body;
        if (rendered.header) displayContent = `[${rendered.header}]\n\n${displayContent}`;
        if (rendered.footer) displayContent = `${displayContent}\n\n_${rendered.footer}_`;

        interactiveMeta = {
          template: {
            name: tmpl.name,
            category: tmpl.category,
            rendered_header: rendered.header,
            rendered_footer: rendered.footer,
            buttons: rendered.buttons,
          },
        };
      } else if (selectedMessageType === 'interactive') {
        displayContent = 'How would you like to proceed?';
        interactiveMeta = {
          interactive: {
            type: 'button',
            buttons: [
              { id: 'btn_confirm', title: interactiveButton1 },
              { id: 'btn_support', title: interactiveButton2 },
            ],
          },
        };
      } else {
        displayContent = customTextMessage;
      }

      // Record ledger entry
      const category: BusinessCategory =
        selectedMessageType === 'template'
          ? businessStore.getTemplateByName(selectedTemplateName)?.category || 'UTILITY'
          : 'SERVICE';

      businessStore.recordLedgerEntry({
        recipient: targetContact,
        category,
        message_type: `${selectedMessageType}${selectedTemplateName ? `:${selectedTemplateName}` : ''}`,
        currency: 'INR',
      });

      // Deliver message into matching conversation
      const cleanTarget = targetContact.replace(/[^0-9]/g, '');
      const targetConv =
        conversations.find((c) =>
          c.id === targetContact ||
          (c.title && c.title.replace(/[^0-9]/g, '').endsWith(cleanTarget.slice(-10)))
        ) || conversations[0];

      if (targetConv) {
        await sendBusinessApiMessage(targetConv.id, {
          content: displayContent,
          type: 'text',
          metadata: interactiveMeta,
        });
      }

      const savings = calculateMessageSavings(category, 'INR');
      const responseData = {
        messaging_product: 'delta_business',
        contacts: [{ input: targetContact, delta_id: `usr_${cleanTarget}` }],
        messages: [
          {
            id: `deltamid.HBgM${Date.now()}9a8b7c`,
            message_status: 'delivered',
            pricing: {
              billable: false,
              rate: '0.00',
              currency: 'INR',
            },
          },
        ],
      };

      setLastApiResponse(responseData);
      refreshState();
      toast.success(`Message delivered successfully to ${targetContact}!`);
    } catch (err: any) {
      toast.error(err.message || 'Error delivering message');
    } finally {
      setIsDispatching(false);
    }
  };

  // Create Template Handler
  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim() || !newTemplateBody.trim()) {
      toast.error('Please enter a template name and message body.');
      return;
    }

    const created = businessStore.addTemplate({
      name: newTemplateName.toLowerCase().trim().replace(/\s+/g, '_'),
      category: newTemplateCategory,
      language: 'en_US',
      header_type: newTemplateHeader ? 'TEXT' : 'NONE',
      header_content: newTemplateHeader || undefined,
      body_text: newTemplateBody,
      footer_text: newTemplateFooter || undefined,
      buttons: newTemplateButtonText
        ? [
            {
              type: 'URL',
              text: newTemplateButtonText,
              url: newTemplateButtonUrl || 'https://example.com',
            },
          ]
        : [],
    });

    toast.success(`Template "${created.name}" created and ready to use!`);
    setNewTemplateName('');
    setNewTemplateHeader('');
    setNewTemplateBody('Hi {{1}}, thank you for choosing our service. Reference: {{2}}.');
    setNewTemplateFooter('');
    setNewTemplateButtonText('');
    setNewTemplateButtonUrl('');
    setIsCreatingTemplate(false);
    refreshState();
  };

  // Generate API Key
  const handleGenerateKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    const created = businessStore.generateApiKey(newKeyName.trim());
    toast.success(`API Key "${created.name}" generated!`);
    setNewKeyName('');
    setIsCreatingKey(false);
    refreshState();
  };

  // Webhook Test Ping
  const handleTestWebhookPing = async () => {
    setIsPingingWebhook(true);
    try {
      const res = await fetch('/api/v1/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'simulate_test_event' }),
      });
      if (res.ok) {
        toast.success('Webhook delivery verified! Server responded 200 OK.');
        businessStore.updateWebhookConfig({
          last_delivery_status: 'success',
          last_delivery_at: new Date().toISOString(),
        });
        refreshState();
      } else {
        toast.error('Webhook ping failed.');
      }
    } catch {
      toast.error('Could not reach webhook endpoint.');
    } finally {
      setIsPingingWebhook(false);
    }
  };

  // AI Agent Simulator Handler
  const handleTestSandbox = async () => {
    if (!sandboxInput.trim() || isSandboxThinking) return;
    const userText = sandboxInput.trim();
    setSandboxInput('');
    setSandboxMessages((prev) => [...prev, { sender: 'user', text: userText, time: 'Just now' }]);
    setIsSandboxThinking(true);
    try {
      const res = await simulateBusinessAiCustomerSupport(userText, profile.business_name, knowledgeFaqs);
      setSandboxMessages((prev) => [...prev, { sender: 'bot', text: res.reply, time: 'Just now' }]);
    } catch {
      setSandboxMessages((prev) => [
        ...prev,
        { sender: 'bot', text: 'Thank you for reaching out! Our team has received your query.', time: 'Just now' },
      ]);
    } finally {
      setIsSandboxThinking(false);
    }
  };

  const handleAddFaq = () => {
    if (!newFaqQuestion.trim() || !newFaqAnswer.trim()) {
      toast.error('Please enter both question and answer.');
      return;
    }
    setKnowledgeFaqs((prev) => [
      ...prev,
      { id: `faq-${Date.now()}`, question: newFaqQuestion.trim(), answer: newFaqAnswer.trim() },
    ]);
    setNewFaqQuestion('');
    setNewFaqAnswer('');
    toast.success('FAQ added to knowledge base');
  };

  const selectedTemplateObj = templates.find((t) => t.name === selectedTemplateName) || templates[0];

  return (
    <div className="flex-1 h-full flex flex-col bg-background overflow-y-auto">
      {/* 1. Clean, Modern Header */}
      <header className="border-b border-border/80 bg-card/80 backdrop-blur-md px-6 py-3.5 sticky top-0 z-30 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-delta-600 text-white flex items-center justify-center shadow-xs">
            <Briefcase className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-foreground">Delta Business</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                <ShieldCheck className="w-3 h-3" />
                Verified
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{profile.business_name} • {profile.phone_number}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setActiveSubTab('send')}
            className="px-3.5 py-1.5 rounded-xl bg-delta-600 hover:bg-delta-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Message</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('chats');
              if (conversations[0]) setActiveConversationId(conversations[0].id);
            }}
            className="px-3 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold flex items-center gap-1.5 border border-border/80 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Inbox</span>
          </button>
        </div>
      </header>

      {/* 2. Simplified Sub-Navigation Tabs */}
      <div className="border-b border-border/70 bg-card px-6 py-1.5 flex items-center gap-1 overflow-x-auto select-none">
        {[
          { id: 'overview', label: 'Overview', icon: Layers },
          { id: 'send', label: 'Send Message', icon: Zap },
          { id: 'templates', label: 'Templates', icon: FileCode2 },
          { id: 'api', label: 'API & Keys', icon: Key },
          { id: 'ai', label: 'AI Assistant', icon: Bot },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                isActive
                  ? 'bg-delta-500/10 text-delta-600 dark:text-delta-400'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Main Body */}
      <div className="flex-1 p-6 max-w-6xl w-full mx-auto space-y-6">

        {/* ==================== 1. OVERVIEW ==================== */}
        {activeSubTab === 'overview' && (
          <div className="space-y-6">
            {/* Clean Metrics: 3 Clear, Meaningful Operational Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-xs font-medium">Total Messages Sent</span>
                  <div className="w-7 h-7 rounded-lg bg-delta-500/10 text-delta-600 flex items-center justify-center">
                    <Send className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {savingsMetrics.totalMessages.toLocaleString()}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  All-time dispatches
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-xs font-medium">Delivery Success Rate</span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  100%
                </p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                  Active • Zero drop rate
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-xs font-medium">Active Templates</span>
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                    <FileCode2 className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {templates.length}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Approved & ready to dispatch
                </p>
              </div>
            </div>

            {/* Quick Actions & Business Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                onClick={() => setActiveSubTab('send')}
                className="p-4 rounded-2xl bg-card border border-border/80 hover:border-delta-500/50 hover:bg-delta-50/20 dark:hover:bg-delta-950/20 cursor-pointer transition-all group shadow-xs"
              >
                <div className="w-8 h-8 rounded-xl bg-delta-500/10 text-delta-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                  <Zap className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-foreground flex items-center justify-between">
                  Send a Message
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-delta-600 group-hover:translate-x-0.5 transition-all" />
                </h3>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Test template notifications, alerts, or direct texts with live preview.
                </p>
              </div>

              <div
                onClick={() => setActiveSubTab('templates')}
                className="p-4 rounded-2xl bg-card border border-border/80 hover:border-delta-500/50 hover:bg-delta-50/20 dark:hover:bg-delta-950/20 cursor-pointer transition-all group shadow-xs"
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                  <FileCode2 className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-foreground flex items-center justify-between">
                  Manage Templates
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                </h3>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Create and organize approved messaging templates for orders, OTPs, and updates.
                </p>
              </div>

              <div
                onClick={() => setActiveSubTab('api')}
                className="p-4 rounded-2xl bg-card border border-border/80 hover:border-delta-500/50 hover:bg-delta-50/20 dark:hover:bg-delta-950/20 cursor-pointer transition-all group shadow-xs"
              >
                <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                  <Key className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-foreground flex items-center justify-between">
                  API & Webhooks
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-violet-600 group-hover:translate-x-0.5 transition-all" />
                </h3>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Access API keys, configure webhooks, and copy integration code snippets.
                </p>
              </div>
            </div>

            {/* Recent Activity Log */}
            <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-foreground">Recent Message Activity</h2>
                  <p className="text-xs text-muted-foreground">
                    Real-time log of dispatched business messages
                  </p>
                </div>
                <button
                  onClick={refreshState}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Refresh Activity"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border/70 text-muted-foreground font-semibold">
                      <th className="py-2.5 px-3">Time</th>
                      <th className="py-2.5 px-3">Recipient</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {ledger.slice(0, 8).map((entry) => (
                      <tr key={entry.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-2.5 px-3 text-muted-foreground font-mono text-[11px]">
                          {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-foreground">
                          {entry.recipient}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              entry.category === 'MARKETING'
                                ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                                : entry.category === 'UTILITY'
                                ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                                : entry.category === 'AUTHENTICATION'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {entry.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground text-[11px]">
                          {entry.message_type}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <Check className="w-3 h-3" />
                            Delivered
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 2. SEND MESSAGE ==================== */}
        {activeSubTab === 'send' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-foreground">Send Message</h2>
                  <p className="text-xs text-muted-foreground">
                    Compose and deliver notifications or interactive messages
                  </p>
                </div>

                {/* Recipient Input */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Recipient Phone Number
                  </label>
                  <input
                    type="text"
                    value={targetContact}
                    onChange={(e) => setTargetContact(e.target.value)}
                    placeholder="+919876543210"
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-delta-500/30"
                  />
                </div>

                {/* Message Format Selector */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Message Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'template', label: 'Template' },
                      { id: 'text', label: 'Direct Text' },
                      { id: 'interactive', label: 'Buttons' },
                    ].map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setSelectedMessageType(type.id as any)}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all border ${
                          selectedMessageType === type.id
                            ? 'bg-delta-500/10 border-delta-500 text-delta-600 dark:text-delta-400 font-bold'
                            : 'border-border bg-background text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Template Fields */}
                {selectedMessageType === 'template' && (
                  <div className="space-y-3 p-3.5 rounded-xl bg-muted/40 border border-border/70">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Select Template
                      </label>
                      <select
                        value={selectedTemplateName}
                        onChange={(e) => setSelectedTemplateName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-delta-500/30"
                      >
                        {templates.map((t) => (
                          <option key={t.id} value={t.name}>
                            {t.name} ({t.category})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                          Placeholder {'{{1}}'}
                        </label>
                        <input
                          type="text"
                          value={templateParam1}
                          onChange={(e) => setTemplateParam1(e.target.value)}
                          placeholder="e.g. Priya"
                          className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                          Placeholder {'{{2}}'}
                        </label>
                        <input
                          type="text"
                          value={templateParam2}
                          onChange={(e) => setTemplateParam2(e.target.value)}
                          placeholder="e.g. DLT-98421"
                          className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                          Placeholder {'{{3}}'}
                        </label>
                        <input
                          type="text"
                          value={templateParam3}
                          onChange={(e) => setTemplateParam3(e.target.value)}
                          placeholder="e.g. 6:00 PM"
                          className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Direct Text Field */}
                {selectedMessageType === 'text' && (
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Message Text
                    </label>
                    <textarea
                      rows={3}
                      value={customTextMessage}
                      onChange={(e) => setCustomTextMessage(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-delta-500/30"
                    />
                  </div>
                )}

                {/* Interactive Buttons Fields */}
                {selectedMessageType === 'interactive' && (
                  <div className="space-y-3 p-3.5 rounded-xl bg-muted/40 border border-border/70">
                    <p className="text-xs font-semibold text-foreground">
                      Button Labels
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-muted-foreground mb-1">Button 1</label>
                        <input
                          type="text"
                          value={interactiveButton1}
                          onChange={(e) => setInteractiveButton1(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-muted-foreground mb-1">Button 2</label>
                        <input
                          type="text"
                          value={interactiveButton2}
                          onChange={(e) => setInteractiveButton2(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Send Button */}
                <button
                  onClick={handleDispatchMessage}
                  disabled={isDispatching}
                  className="w-full py-2.5 rounded-xl bg-delta-600 hover:bg-delta-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-98 shadow-xs disabled:opacity-50"
                >
                  <Send className={`w-3.5 h-3.5 ${isDispatching ? 'animate-spin' : ''}`} />
                  <span>{isDispatching ? 'Sending...' : 'Send Message Now'}</span>
                </button>
              </div>

              {/* Delivery Receipt / Response Accordion */}
              {lastApiResponse && (
                <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Message Sent Successfully
                    </span>
                    <button
                      onClick={() => setShowRawJson(!showRawJson)}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium"
                    >
                      <span>{showRawJson ? 'Hide Details' : 'View API JSON'}</span>
                      <ChevronDown className={`w-3 h-3 transition-transform ${showRawJson ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {showRawJson && (
                    <div className="mt-2 pt-2 border-t border-border/60">
                      <pre className="p-3 rounded-xl bg-muted/60 text-[11px] font-mono text-foreground overflow-x-auto">
                        {JSON.stringify(lastApiResponse, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Live Phone Mockup (5 cols) */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="w-full max-w-[320px] rounded-[36px] border-4 border-foreground/15 bg-background shadow-xl overflow-hidden p-3 flex flex-col h-[520px]">
                {/* Phone Speaker */}
                <div className="w-20 h-3 bg-muted/70 rounded-full mx-auto mb-2" />

                {/* Chat Header */}
                <div className="px-3 py-2 border-b border-border/80 flex items-center gap-2 bg-card rounded-t-xl">
                  <img
                    src={profile.avatar_url}
                    alt={profile.business_name}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                  <div className="flex-1 truncate">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1 truncate">
                      {profile.business_name}
                      <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Business Account
                    </p>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 p-3 bg-muted/20 overflow-y-auto space-y-2.5 text-xs">
                  <div className="bg-card border border-border/80 rounded-2xl rounded-tl-xs p-3 shadow-xs space-y-2">
                    {selectedMessageType === 'template' && (
                      <>
                        {selectedTemplateObj.header_content && (
                          <p className="text-xs font-bold text-foreground border-b border-border/50 pb-1">
                            {selectedTemplateObj.header_content}
                          </p>
                        )}
                        <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                          {selectedTemplateObj.body_text
                            .replace('{{1}}', templateParam1)
                            .replace('{{2}}', templateParam2)
                            .replace('{{3}}', templateParam3)}
                        </p>
                        {selectedTemplateObj.footer_text && (
                          <p className="text-[10px] text-muted-foreground italic">
                            {selectedTemplateObj.footer_text}
                          </p>
                        )}
                        {selectedTemplateObj.buttons && selectedTemplateObj.buttons.length > 0 && (
                          <div className="space-y-1 pt-1.5 border-t border-border/50">
                            {selectedTemplateObj.buttons.map((btn, bIdx) => (
                              <button
                                key={bIdx}
                                type="button"
                                className="w-full py-1.5 px-3 rounded-lg bg-delta-500/10 text-delta-600 dark:text-delta-400 text-xs font-semibold text-center flex items-center justify-center gap-1"
                              >
                                {btn.type === 'URL' && <ExternalLink className="w-3 h-3" />}
                                <span>{btn.text}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    {selectedMessageType === 'interactive' && (
                      <>
                        <p className="text-xs text-foreground leading-relaxed">
                          How would you like to proceed?
                        </p>
                        <div className="space-y-1 pt-1.5 border-t border-border/50">
                          <button
                            type="button"
                            className="w-full py-1.5 px-3 rounded-lg bg-delta-500/10 text-delta-600 dark:text-delta-400 text-xs font-semibold text-center"
                          >
                            {interactiveButton1}
                          </button>
                          <button
                            type="button"
                            className="w-full py-1.5 px-3 rounded-lg bg-delta-500/10 text-delta-600 dark:text-delta-400 text-xs font-semibold text-center"
                          >
                            {interactiveButton2}
                          </button>
                        </div>
                      </>
                    )}

                    {selectedMessageType === 'text' && (
                      <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                        {customTextMessage}
                      </p>
                    )}

                    <div className="flex items-center justify-end text-[10px] text-muted-foreground pt-1">
                      <span>Now • Delivered</span>
                    </div>
                  </div>
                </div>

                <div className="p-1.5 border-t border-border/80 text-center text-[10px] text-muted-foreground">
                  Live Preview
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 3. TEMPLATES ==================== */}
        {activeSubTab === 'templates' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground">Message Templates</h2>
                <p className="text-xs text-muted-foreground">
                  Pre-configured templates for customer notifications, OTPs, and updates
                </p>
              </div>
              <button
                onClick={() => setIsCreatingTemplate(!isCreatingTemplate)}
                className="px-3.5 py-2 rounded-xl bg-delta-600 hover:bg-delta-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>{isCreatingTemplate ? 'Close Form' : 'New Template'}</span>
              </button>
            </div>

            {/* Template Creation Form */}
            {isCreatingTemplate && (
              <form onSubmit={handleCreateTemplate} className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-4">
                <h3 className="text-xs font-bold text-foreground">Create New Template</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Template Name (e.g. order_alert)
                    </label>
                    <input
                      type="text"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      placeholder="e.g. appointment_reminder"
                      className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Category
                    </label>
                    <select
                      value={newTemplateCategory}
                      onChange={(e) => setNewTemplateCategory(e.target.value as any)}
                      className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-xs font-medium"
                    >
                      <option value="UTILITY">Utility (Alerts & Order Tracking)</option>
                      <option value="MARKETING">Marketing (Promotions & Updates)</option>
                      <option value="AUTHENTICATION">Authentication (OTP Verification)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Header Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={newTemplateHeader}
                    onChange={(e) => setNewTemplateHeader(e.target.value)}
                    placeholder="e.g. 📦 Order Dispatched"
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Message Body (use {'{{1}}'}, {'{{2}}'} for placeholders)
                  </label>
                  <textarea
                    rows={3}
                    value={newTemplateBody}
                    onChange={(e) => setNewTemplateBody(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-xs leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Button Label (Optional)
                    </label>
                    <input
                      type="text"
                      value={newTemplateButtonText}
                      onChange={(e) => setNewTemplateButtonText(e.target.value)}
                      placeholder="e.g. Track Order"
                      className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Button URL (Optional)
                    </label>
                    <input
                      type="text"
                      value={newTemplateButtonUrl}
                      onChange={(e) => setNewTemplateButtonUrl(e.target.value)}
                      placeholder="https://example.com/order/{{2}}"
                      className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingTemplate(false)}
                    className="px-4 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-delta-600 hover:bg-delta-700 text-white font-bold text-xs"
                  >
                    Save Template
                  </button>
                </div>
              </form>
            )}

            {/* Template List Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-bold text-xs text-foreground">
                        {tmpl.name}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          tmpl.category === 'MARKETING'
                            ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                            : tmpl.category === 'UTILITY'
                            ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {tmpl.category}
                      </span>
                    </div>

                    {tmpl.header_content && (
                      <p className="text-xs font-bold text-foreground mb-1">{tmpl.header_content}</p>
                    )}
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {tmpl.body_text}
                    </p>
                    {tmpl.footer_text && (
                      <p className="text-[11px] text-muted-foreground italic mt-2">
                        {tmpl.footer_text}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <Check className="w-3 h-3" /> Approved
                    </span>
                    <button
                      onClick={() => {
                        setSelectedTemplateName(tmpl.name);
                        setActiveSubTab('send');
                      }}
                      className="text-xs font-semibold text-delta-600 hover:text-delta-700 flex items-center gap-1"
                    >
                      <span>Use Template</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== 4. DEVELOPER & API ==================== */}
        {activeSubTab === 'api' && (
          <div className="space-y-6">
            {/* API Keys Card */}
            <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-foreground">API Keys</h2>
                  <p className="text-xs text-muted-foreground">
                    Use Bearer tokens to authenticate HTTP requests to `/api/v1/messages`
                  </p>
                </div>
                <button
                  onClick={() => setIsCreatingKey(!isCreatingKey)}
                  className="px-3 py-1.5 rounded-xl bg-delta-600 hover:bg-delta-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Key</span>
                </button>
              </div>

              {isCreatingKey && (
                <form
                  onSubmit={handleGenerateKey}
                  className="p-3.5 rounded-xl bg-muted/40 border border-border flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="Key Name (e.g. Production Server)"
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-xs"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-lg bg-delta-600 text-white font-bold text-xs"
                  >
                    Generate
                  </button>
                </form>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border/70 text-muted-foreground font-semibold">
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Token</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {apiKeys.map((key) => (
                      <tr key={key.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3 px-3 font-semibold text-foreground">{key.name}</td>
                        <td className="py-3 px-3 font-mono text-xs text-muted-foreground flex items-center gap-2">
                          <span>{key.hint}</span>
                          <button
                            onClick={() => copyToClipboard(key.key, 'API Key')}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                            title="Copy full key"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-semibold">
                            Active
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => {
                              businessStore.revokeApiKey(key.id);
                              refreshState();
                              toast.success('API key revoked');
                            }}
                            className="p-1 rounded text-destructive hover:bg-destructive/10"
                            title="Revoke Key"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Webhooks Card */}
            <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-foreground">Webhook Settings</h2>
                  <p className="text-xs text-muted-foreground">
                    Receive delivery receipts and incoming messages
                  </p>
                </div>
                <button
                  onClick={handleTestWebhookPing}
                  disabled={isPingingWebhook}
                  className="px-3 py-1.5 rounded-xl border border-border hover:bg-muted text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Webhook className={`w-3.5 h-3.5 text-delta-600 ${isPingingWebhook ? 'animate-spin' : ''}`} />
                  <span>Test Connection</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-foreground mb-1">Webhook URL</label>
                  <input
                    type="text"
                    value={webhookConfig.url}
                    onChange={(e) => {
                      const updated = businessStore.updateWebhookConfig({ url: e.target.value });
                      setWebhookConfig(updated);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-foreground mb-1">Verify Token</label>
                  <input
                    type="text"
                    value={webhookConfig.verify_token}
                    onChange={(e) => {
                      const updated = businessStore.updateWebhookConfig({ verify_token: e.target.value });
                      setWebhookConfig(updated);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background font-mono text-xs"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-muted/30 border border-border/60 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-2 font-medium text-foreground">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Status: Connected
                </span>
                <span className="text-muted-foreground font-mono text-[11px]">
                  Last Ping: {webhookConfig.last_delivery_at ? new Date(webhookConfig.last_delivery_at).toLocaleTimeString() : 'Verified'}
                </span>
              </div>
            </div>

            {/* Quick Code Integration Snippets */}
            <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-foreground">Integration Code</h2>
                  <p className="text-xs text-muted-foreground">
                    Directly drop into your backend or server
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg">
                  <button
                    onClick={() => setCodeTab('curl')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                      codeTab === 'curl' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground'
                    }`}
                  >
                    cURL
                  </button>
                  <button
                    onClick={() => setCodeTab('node')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                      codeTab === 'node' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground'
                    }`}
                  >
                    Node.js
                  </button>
                </div>
              </div>

              {codeTab === 'curl' ? (
                <div className="relative">
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `curl -X POST https://delta-messaging.vercel.app/api/v1/messages \\\n  -H "Authorization: Bearer dlt_live_apex_token" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "messaging_product": "delta",\n    "to": "+919876543210",\n    "type": "template",\n    "template": {\n      "name": "order_dispatched",\n      "language": { "code": "en_US" },\n      "components": [\n        {\n          "type": "body",\n          "parameters": [\n            { "type": "text", "text": "Priya" },\n            { "type": "text", "text": "ORD-54321" },\n            { "type": "text", "text": "6:00 PM" }\n          ]\n        }\n      ]\n    }\n  }'`,
                        'cURL command'
                      )
                    }
                    className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-md bg-card/80 hover:bg-card text-foreground text-xs font-medium flex items-center gap-1 border border-border/70 shadow-2xs"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </button>
                  <pre className="p-4 rounded-xl bg-muted/50 text-[11px] font-mono text-foreground overflow-x-auto border border-border/60">
{`curl -X POST https://delta-messaging.vercel.app/api/v1/messages \\
  -H "Authorization: Bearer dlt_live_apex_token" \\
  -H "Content-Type: application/json" \\
  -d '{
    "messaging_product": "delta",
    "to": "+919876543210",
    "type": "template",
    "template": {
      "name": "order_dispatched",
      "language": { "code": "en_US" },
      "components": [
        {
          "type": "body",
          "parameters": [
            { "type": "text", "text": "Priya" },
            { "type": "text", "text": "ORD-54321" },
            { "type": "text", "text": "6:00 PM" }
          ]
        }
      ]
    }
  }'`}
                  </pre>
                </div>
              ) : (
                <div className="relative">
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `const response = await fetch('https://delta-messaging.vercel.app/api/v1/messages', {\n  method: 'POST',\n  headers: {\n    'Authorization': 'Bearer ' + process.env.DELTA_API_KEY,\n    'Content-Type': 'application/json',\n  },\n  body: JSON.stringify({\n    messaging_product: 'delta',\n    to: '+919876543210',\n    type: 'text',\n    text: { body: 'Your verification OTP is 849201' },\n  }),\n});\nconst result = await response.json();\nconsole.log(result.messages[0]);`,
                        'Node.js code'
                      )
                    }
                    className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-md bg-card/80 hover:bg-card text-foreground text-xs font-medium flex items-center gap-1 border border-border/70 shadow-2xs"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </button>
                  <pre className="p-4 rounded-xl bg-muted/50 text-[11px] font-mono text-foreground overflow-x-auto border border-border/60">
{`const response = await fetch('https://delta-messaging.vercel.app/api/v1/messages', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + process.env.DELTA_API_KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    messaging_product: 'delta',
    to: '+919876543210',
    type: 'text',
    text: { body: 'Your verification OTP is 849201' },
  }),
});
const result = await response.json();
console.log(result.messages[0]);`}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== 5. AI ASSISTANT ==================== */}
        {activeSubTab === 'ai' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Persona & Knowledge Base (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Bot className="w-4 h-4 text-delta-600" />
                    Agent Settings
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Auto-Reply:</span>
                    <button
                      type="button"
                      onClick={() => setBotAutoPilot(!botAutoPilot)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        botAutoPilot ? 'bg-delta-600' : 'bg-muted-foreground/30'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          botAutoPilot ? 'translate-x-4.5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Bot Name
                    </label>
                    <input
                      type="text"
                      value={botName}
                      onChange={(e) => setBotName(e.target.value)}
                      className="w-full bg-background text-foreground text-xs px-3 py-2 rounded-xl border border-border focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Tone
                    </label>
                    <select
                      value={botPersona}
                      onChange={(e) => setBotPersona(e.target.value as any)}
                      className="w-full bg-background text-foreground text-xs px-3 py-2 rounded-xl border border-border focus:outline-none"
                    >
                      <option value="friendly">Friendly & Helpful</option>
                      <option value="professional">Formal & Direct</option>
                      <option value="tanglish">Regional / Tanglish</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Knowledge Base FAQs */}
              <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Knowledge Base FAQs</h3>
                    <p className="text-xs text-muted-foreground">The bot matches these questions when customers ask for support</p>
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground">{knowledgeFaqs.length} FAQs</span>
                </div>

                <div className="space-y-2">
                  {knowledgeFaqs.map((faq) => (
                    <div
                      key={faq.id}
                      className="p-3 rounded-xl bg-muted/40 border border-border/60 flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground">Q: {faq.question}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">A: {faq.answer}</p>
                      </div>
                      <button
                        onClick={() => setKnowledgeFaqs((prev) => prev.filter((f) => f.id !== faq.id))}
                        className="text-muted-foreground hover:text-destructive p-1 rounded-lg transition-colors"
                        title="Delete FAQ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add FAQ form */}
                <div className="pt-2 border-t border-border/60 space-y-2">
                  <p className="text-xs font-semibold text-foreground">+ Add New FAQ</p>
                  <input
                    type="text"
                    placeholder="Question (e.g. Do you deliver to Bangalore?)"
                    value={newFaqQuestion}
                    onChange={(e) => setNewFaqQuestion(e.target.value)}
                    className="w-full bg-background text-foreground text-xs px-3 py-1.5 rounded-lg border border-border focus:outline-none"
                  />
                  <textarea
                    rows={2}
                    placeholder="Answer"
                    value={newFaqAnswer}
                    onChange={(e) => setNewFaqAnswer(e.target.value)}
                    className="w-full bg-background text-foreground text-xs px-3 py-1.5 rounded-lg border border-border focus:outline-none"
                  />
                  <button
                    onClick={handleAddFaq}
                    className="px-3.5 py-1.5 rounded-xl bg-delta-600 hover:bg-delta-700 text-white text-xs font-bold transition-all shadow-xs"
                  >
                    Save FAQ
                  </button>
                </div>
              </div>
            </div>

            {/* Live Bot Simulator (5 cols) */}
            <div className="lg:col-span-5">
              <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col h-[520px]">
                <div className="flex items-center justify-between pb-3 border-b border-border/80">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-delta-600/10 text-delta-600 flex items-center justify-center font-bold text-xs">
                      🤖
                    </div>
                    <span className="text-xs font-bold text-foreground">{botName} Simulator</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Ready
                  </span>
                </div>

                {/* Simulator Messages */}
                <div className="flex-1 overflow-y-auto py-3 space-y-2 text-xs">
                  {sandboxMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                          msg.sender === 'user'
                            ? 'bg-delta-600 text-white rounded-br-xs'
                            : 'bg-muted/70 text-foreground border border-border/60 rounded-bl-xs'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>
                      <span className="text-[9px] text-muted-foreground px-1 mt-0.5">
                        {msg.time}
                      </span>
                    </div>
                  ))}

                  {isSandboxThinking && (
                    <div className="text-xs text-muted-foreground italic px-2">
                      {botName} is typing...
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="flex items-center gap-2 pt-2 border-t border-border/80">
                  <input
                    type="text"
                    placeholder="Ask a question..."
                    value={sandboxInput}
                    onChange={(e) => setSandboxInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTestSandbox()}
                    className="flex-1 bg-background text-foreground text-xs px-3 py-2 rounded-xl border border-border focus:outline-none"
                  />
                  <button
                    onClick={handleTestSandbox}
                    disabled={isSandboxThinking || !sandboxInput.trim()}
                    className="px-3 py-2 rounded-xl bg-delta-600 hover:bg-delta-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-40"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

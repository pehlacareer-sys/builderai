'use client'

import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, X, Sparkles, ShoppingCart, BookOpen, User, BarChart3,
  Server, MessageSquare, FileText, Layout, Palette,
  ArrowRight, Check,
} from 'lucide-react'

// ─── Template Data ──────────────────────────────────────────────────────────

interface Template {
  id: string
  name: string
  description: string
  category: string
  techStack: string[]
  icon: React.ElementType
  gradient: string
  iconColor: string
}

const TEMPLATES: Template[] = [
  {
    id: 'saas-landing',
    name: 'SaaS Landing Page',
    description: 'Modern SaaS landing page with pricing, features, testimonials, and CTA sections. Includes email signup and analytics integration.',
    category: 'SaaS',
    techStack: ['Next.js', 'Tailwind', 'Framer Motion'],
    icon: Sparkles,
    gradient: 'from-emerald-400 to-teal-500',
    iconColor: 'text-white',
  },
  {
    id: 'ecommerce-store',
    name: 'E-commerce Store',
    description: 'Full-featured online store with product catalog, cart, checkout flow, and payment integration. Includes admin product management.',
    category: 'E-commerce',
    techStack: ['Next.js', 'Tailwind', 'Prisma'],
    icon: ShoppingCart,
    gradient: 'from-amber-400 to-orange-500',
    iconColor: 'text-white',
  },
  {
    id: 'blog-platform',
    name: 'Blog Platform',
    description: 'Content-rich blog with MDX support, categories, tags, search, and RSS feed. Includes draft management and SEO optimization.',
    category: 'Blog',
    techStack: ['Next.js', 'MDX', 'Tailwind'],
    icon: BookOpen,
    gradient: 'from-sky-400 to-blue-500',
    iconColor: 'text-white',
  },
  {
    id: 'portfolio-website',
    name: 'Portfolio Website',
    description: 'Creative portfolio with project showcase, about section, contact form, and smooth animations. Dark/light mode included.',
    category: 'Portfolio',
    techStack: ['Next.js', 'Tailwind', 'Framer Motion'],
    icon: User,
    gradient: 'from-violet-400 to-purple-500',
    iconColor: 'text-white',
  },
  {
    id: 'admin-dashboard',
    name: 'Admin Dashboard',
    description: 'Comprehensive admin panel with charts, data tables, user management, and real-time notifications. Includes role-based access.',
    category: 'Dashboard',
    techStack: ['Next.js', 'Tailwind', 'Prisma', 'Chart.js'],
    icon: BarChart3,
    gradient: 'from-teal-400 to-cyan-500',
    iconColor: 'text-white',
  },
  {
    id: 'rest-api-starter',
    name: 'REST API Starter',
    description: 'Production-ready API with authentication, rate limiting, validation, and OpenAPI docs. Includes Prisma ORM and SQLite.',
    category: 'API',
    techStack: ['Next.js', 'Prisma', 'Zod'],
    icon: Server,
    gradient: 'from-rose-400 to-red-500',
    iconColor: 'text-white',
  },
  {
    id: 'realtime-chat',
    name: 'Real-time Chat App',
    description: 'Instant messaging app with rooms, direct messages, file sharing, and typing indicators. WebSocket powered real-time updates.',
    category: 'SaaS',
    techStack: ['Next.js', 'Socket.io', 'Tailwind'],
    icon: MessageSquare,
    gradient: 'from-indigo-400 to-blue-600',
    iconColor: 'text-white',
  },
  {
    id: 'documentation-site',
    name: 'Documentation Site',
    description: 'Beautiful docs site with search, versioning, code blocks with syntax highlighting, and automatic sidebar navigation.',
    category: 'Blog',
    techStack: ['Next.js', 'MDX', 'Tailwind'],
    icon: FileText,
    gradient: 'from-pink-400 to-rose-500',
    iconColor: 'text-white',
  },
  {
    id: 'ecommerce-marketplace',
    name: 'Marketplace Platform',
    description: 'Multi-vendor marketplace with seller dashboards, product listings, reviews, and commission tracking system.',
    category: 'E-commerce',
    techStack: ['Next.js', 'Prisma', 'Tailwind', 'Stripe'],
    icon: Layout,
    gradient: 'from-yellow-400 to-amber-500',
    iconColor: 'text-white',
  },
  {
    id: 'design-system',
    name: 'Design System',
    description: 'Component library starter with Storybook, theme tokens, accessibility patterns, and comprehensive documentation.',
    category: 'Dashboard',
    techStack: ['Next.js', 'Tailwind', 'TypeScript'],
    icon: Palette,
    gradient: 'from-fuchsia-400 to-purple-600',
    iconColor: 'text-white',
  },
]

const CATEGORIES = ['All', 'SaaS', 'E-commerce', 'Blog', 'Portfolio', 'Dashboard', 'API'] as const

// ─── Category Badge Colors ───────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  'SaaS': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  'E-commerce': 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  'Blog': 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-800',
  'Portfolio': 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border-violet-200 dark:border-violet-800',
  'Dashboard': 'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200 dark:border-teal-800',
  'API': 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800',
}

// ─── Template Card ───────────────────────────────────────────────────────────

function TemplateCard({
  template,
  index,
  onUseTemplate,
}: {
  template: Template
  index: number
  onUseTemplate: (template: Template) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ y: -4, scale: 1.01 }}
      className="group"
    >
      <div className="rounded-xl border bg-card/80 backdrop-blur-xl shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 overflow-hidden hover:border-emerald-200 dark:hover:border-emerald-800">
        {/* Preview Image Placeholder */}
        <div className={`relative h-32 bg-gradient-to-br ${template.gradient} flex items-center justify-center overflow-hidden`}>
          {/* Decorative circles */}
          <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/10" />
          <div className="absolute top-2 right-8 w-8 h-8 rounded-full bg-white/5" />
          <template.icon className={`w-10 h-10 ${template.iconColor} relative z-10 drop-shadow-lg group-hover:scale-110 transition-transform duration-300`} />
          {/* Category Badge */}
          <Badge className={`absolute top-2.5 right-2.5 text-[10px] px-1.5 py-0 border ${CATEGORY_COLORS[template.category] || 'bg-muted text-muted-foreground'}`}>
            {template.category}
          </Badge>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-sm mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            {template.name}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3 min-h-[2.5rem]">
            {template.description}
          </p>

          {/* Tech Stack Badges */}
          <div className="flex flex-wrap gap-1 mb-3">
            {template.techStack.map((tech) => (
              <span
                key={tech}
                className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted/80 text-muted-foreground font-medium"
              >
                {tech}
              </span>
            ))}
          </div>

          {/* Use Template Button */}
          <Button
            size="sm"
            className="w-full h-8 text-xs bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-sm hover:shadow-md hover:shadow-emerald-500/20 transition-all"
            onClick={() => onUseTemplate(template)}
          >
            <Sparkles className="w-3 h-3 mr-1.5" />
            Use Template
            <ArrowRight className="w-3 h-3 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Templates Marketplace Dialog ────────────────────────────────────────────

interface TemplatesMarketplaceProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUseTemplate: (template: Template) => void
}

export function TemplatesMarketplace({ open, onOpenChange, onUseTemplate }: TemplatesMarketplaceProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('All')

  // Filter templates by search and category
  const filteredTemplates = useMemo(() => {
    return TEMPLATES.filter((template) => {
      const matchesCategory = activeCategory === 'All' || template.category === activeCategory
      const matchesSearch = !searchQuery.trim() ||
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.techStack.some((tech) => tech.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchesCategory && matchesSearch
    })
  }, [searchQuery, activeCategory])

  const handleUseTemplate = (template: Template) => {
    onUseTemplate(template)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-w-[calc(100%-1.5rem)] max-h-[85vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b bg-gradient-to-b from-emerald-50/50 to-transparent dark:from-emerald-950/20 dark:to-transparent">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              Templates Marketplace
            </DialogTitle>
            <DialogDescription className="text-sm">
              Start with a pre-built template and customize it with AI
            </DialogDescription>
          </DialogHeader>

          {/* Search Bar */}
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search templates by name, description, or tech stack..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 pr-9 text-sm bg-background/80 border-emerald-200/50 dark:border-emerald-800/50 focus-visible:ring-emerald-500/30"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-muted-foreground/15 hover:bg-muted-foreground/30 flex items-center justify-center transition-colors"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  activeCategory === category
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/25'
                    : 'bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-h-[calc(85vh-220px)]">
          {filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="w-10 h-10 text-muted-foreground/20 mb-3" />
              <h3 className="text-sm font-semibold text-muted-foreground mb-1">No templates found</h3>
              <p className="text-xs text-muted-foreground">
                {searchQuery
                  ? `No templates matching "${searchQuery}"`
                  : `No templates in "${activeCategory}" category`}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 text-xs"
                onClick={() => {
                  setSearchQuery('')
                  setActiveCategory('All')
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredTemplates.map((template, i) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    index={i}
                    onUseTemplate={handleUseTemplate}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 sm:px-6 py-3 bg-muted/30 flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} available
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Check className="w-3 h-3 text-emerald-500" />
            AI-ready
            <span className="mx-1">·</span>
            <Check className="w-3 h-3 text-emerald-500" />
            Production-grade
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export type { Template }

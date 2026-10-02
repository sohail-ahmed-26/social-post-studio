import React from 'react';
import { icons } from 'lucide-react';

export interface DesignSpec {
  compositionFamily: "editorial" | "infographic" | "typography-led" | "split" | "data-viz" | "comparison" | "timeline" | "diagram" | "promotional";
  layout: {
    type: "centered" | "split-left" | "split-right" | "card-overlay" | "grid";
    alignment: "left" | "center" | "right";
    padding: string;
  };
  colors: {
    background: string;
    surface: string;
    primaryText: string;
    secondaryText: string;
    accent: string;
  };
  typography: {
    fontFamily: "sans" | "serif" | "mono";
    headlineScale: string;
    subtextScale: string;
  };
  elements: {
    showCard: boolean;
    shapes: ("circle" | "dots" | "waves" | "grid")[];
    icon?: string;
    decorativeLine: boolean;
  };
  dimensions: {
    aspectRatio: "1/1" | "4/5" | "16/9";
  };
}

interface PostDesignerProps {
  spec: DesignSpec;
  headline: string;
  subtext: string;
}

export const PostDesigner = React.forwardRef<HTMLDivElement, PostDesignerProps>(({ spec, headline, subtext }, ref) => {
  const Icon = spec.elements.icon ? (icons as any)[spec.elements.icon] : null;

  const bgStyle = spec.colors.background.startsWith("linear-gradient") || spec.colors.background.startsWith("radial-gradient")
    ? { backgroundImage: spec.colors.background }
    : { backgroundColor: spec.colors.background };

  const fontFamilyMap = {
    sans: 'ui-sans-serif, system-ui, sans-serif',
    serif: 'ui-serif, Georgia, serif',
    mono: 'ui-monospace, SFMono-Regular, monospace'
  };

  const textAlignMap = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right'
  };

  const alignItemMap = {
    left: 'items-start',
    center: 'items-center',
    right: 'items-end'
  };

  // Base typography styles
  const headlineStyle = {
    color: spec.colors.primaryText,
    fontFamily: fontFamilyMap[spec.typography.fontFamily],
    fontSize: spec.typography.headlineScale,
    lineHeight: '1.2',
    fontWeight: '800',
    textWrap: 'balance' as const,
  };

  const subtextStyle = {
    color: spec.colors.secondaryText,
    fontFamily: fontFamilyMap[spec.typography.fontFamily],
    fontSize: spec.typography.subtextScale,
    lineHeight: '1.5',
    fontWeight: '500',
    textWrap: 'balance' as const,
  };

  const containerStyle = {
    ...bgStyle,
    aspectRatio: spec.dimensions.aspectRatio.replace('/', ' / '),
  };

  // Content rendering based on layout
  const renderContent = () => {
    const content = (
      <div className={`flex flex-col space-y-4 z-10 ${textAlignMap[spec.layout.alignment]} ${alignItemMap[spec.layout.alignment]}`}>
        {Icon && <Icon size={48} style={{ color: spec.colors.accent, marginBottom: '16px' }} />}
        
        {headline && <h2 style={headlineStyle}>{headline}</h2>}
        
        {spec.elements.decorativeLine && (
          <div style={{ width: '64px', height: '4px', backgroundColor: spec.colors.accent, margin: '24px 0' }} />
        )}
        
        {subtext && <p style={subtextStyle}>{subtext}</p>}
      </div>
    );

    if (spec.elements.showCard || spec.layout.type === 'card-overlay') {
      return (
        <div style={{ backgroundColor: spec.colors.surface, padding: spec.layout.padding, borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }} className="z-10 w-full max-w-[85%]">
          {content}
        </div>
      );
    }

    return (
      <div style={{ padding: spec.layout.padding }} className="z-10 w-full">
        {content}
      </div>
    );
  };

  return (
    <div 
      ref={ref}
      style={containerStyle}
      className="relative overflow-hidden flex w-full h-full border-y border-border"
    >
      {/* Decorative shapes */}
      {spec.elements.shapes.includes("circle") && (
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20 -translate-y-1/2 translate-x-1/3" style={{ backgroundColor: spec.colors.accent }} />
      )}
      {spec.elements.shapes.includes("dots") && (
        <div className="absolute bottom-12 left-12 w-32 h-32 opacity-20" style={{ backgroundImage: `radial-gradient(${spec.colors.accent} 2px, transparent 2px)`, backgroundSize: '16px 16px' }} />
      )}

      {/* Layout arrangements */}
      {spec.layout.type === 'split-left' && (
        <div className="flex w-full h-full">
          <div className="w-1/2 h-full flex flex-col justify-center" style={{ backgroundColor: spec.colors.surface }}>
            {renderContent()}
          </div>
          <div className="w-1/2 h-full relative overflow-hidden flex items-center justify-center p-12">
             {/* Placeholder for an image or visual element in the split layout */}
             {Icon ? <Icon size={120} style={{ color: spec.colors.primaryText, opacity: 0.1 }} /> : null}
          </div>
        </div>
      )}

      {spec.layout.type === 'split-right' && (
        <div className="flex w-full h-full">
          <div className="w-1/2 h-full relative overflow-hidden flex items-center justify-center p-12">
             {Icon ? <Icon size={120} style={{ color: spec.colors.primaryText, opacity: 0.1 }} /> : null}
          </div>
          <div className="w-1/2 h-full flex flex-col justify-center" style={{ backgroundColor: spec.colors.surface }}>
            {renderContent()}
          </div>
        </div>
      )}

      {(spec.layout.type === 'centered' || spec.layout.type === 'card-overlay' || spec.layout.type === 'grid') && (
        <div className="flex w-full h-full items-center justify-center">
          {renderContent()}
        </div>
      )}
    </div>
  );
});

PostDesigner.displayName = 'PostDesigner';

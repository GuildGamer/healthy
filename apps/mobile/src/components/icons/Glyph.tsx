import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { GLYPH_SHAPES, type GlyphName, type GlyphShape } from './glyph-shapes';

const GLYPH_STROKE_WIDTH = 1.75;

interface GlyphProps {
  name: GlyphName;
  color: string;
  size?: number;
  /** Colour behind the glyph, used to carve `cutout` shapes. */
  cutoutColor?: string;
  strokeWidth?: number;
  testID?: string;
}

function shapeColors(shape: GlyphShape, color: string, cutoutColor: string) {
  if (shape.fill === 'solid') {
    return { fill: color, stroke: color };
  }

  if (shape.fill === 'cutout') {
    return { fill: cutoutColor, stroke: cutoutColor };
  }

  return { fill: 'none', stroke: color };
}

function GlyphShapeView({
  shape,
  color,
  cutoutColor,
}: {
  shape: GlyphShape;
  color: string;
  cutoutColor: string;
}) {
  const paint = shapeColors(shape, color, cutoutColor);

  if (shape.kind === 'circle') {
    return <Circle cx={shape.cx} cy={shape.cy} r={shape.r} {...paint} />;
  }

  if (shape.kind === 'rect') {
    return (
      <Rect
        height={shape.height}
        rx={shape.rx}
        width={shape.width}
        x={shape.x}
        y={shape.y}
        {...paint}
      />
    );
  }

  return <Path d={shape.d} {...paint} />;
}

export function Glyph({
  name,
  color,
  size = 24,
  cutoutColor = 'transparent',
  strokeWidth = GLYPH_STROKE_WIDTH,
  testID,
}: GlyphProps) {
  return (
    <Svg
      fill="none"
      height={size}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      testID={testID}
      viewBox="0 0 24 24"
      width={size}
    >
      {GLYPH_SHAPES[name].map((shape, index) => (
        <GlyphShapeView
          color={color}
          cutoutColor={cutoutColor}
          key={`${name}-${index}`}
          shape={shape}
        />
      ))}
    </Svg>
  );
}

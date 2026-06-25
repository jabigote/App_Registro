import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';

export interface SignaturePadRef {
  getSvgXml: () => string | null;
  clear: () => void;
  isEmpty: () => boolean;
}

interface Props {
  width: number;
  height?: number;
  strokeColor?: string;
  strokeWidth?: number;
}

export const SignaturePad = forwardRef<SignaturePadRef, Props>(
  ({ width, height = 150, strokeColor = '#1a1a1a', strokeWidth = 2.5 }, ref) => {
    const [completedPaths, setCompletedPaths] = useState<string[]>([]);
    const [currentD, setCurrentD] = useState<string>('');
    const currentDRef = useRef<string>('');

    const gesture = Gesture.Pan()
      .runOnJS(true)
      .minDistance(0)
      .onBegin((e) => {
        const d = `M ${e.x.toFixed(1)} ${e.y.toFixed(1)}`;
        currentDRef.current = d;
        setCurrentD(d);
      })
      .onUpdate((e) => {
        const d = `${currentDRef.current} L ${e.x.toFixed(1)} ${e.y.toFixed(1)}`;
        currentDRef.current = d;
        setCurrentD(d);
      })
      .onFinalize(() => {
        if (currentDRef.current) {
          const finished = currentDRef.current;
          setCompletedPaths((prev) => [...prev, finished]);
          currentDRef.current = '';
          setCurrentD('');
        }
      });

    const buildSvgXml = (): string | null => {
      const all = [...completedPaths];
      if (currentDRef.current) all.push(currentDRef.current);
      if (all.length === 0) return null;
      const strokeAttrs = `stroke="${strokeColor}" stroke-width="${strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
      const paths = all.map((d) => `<path d="${d}" ${strokeAttrs}/>`).join('');
      return (
        `<?xml version="1.0" encoding="UTF-8"?>` +
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
        `<rect width="${width}" height="${height}" fill="white"/>` +
        paths +
        `</svg>`
      );
    };

    useImperativeHandle(ref, () => ({
      getSvgXml: buildSvgXml,
      clear: () => {
        setCompletedPaths([]);
        setCurrentD('');
        currentDRef.current = '';
      },
      isEmpty: () => completedPaths.length === 0 && currentDRef.current.length === 0,
    }));

    const strokeProps = {
      stroke: strokeColor,
      strokeWidth,
      fill: 'none',
      strokeLinecap: 'round' as const,
      strokeLinejoin: 'round' as const,
    };

    const hasContent = completedPaths.length > 0 || currentD.length > 0;

    return (
      <GestureDetector gesture={gesture}>
        <View style={[styles.canvas, { width, height }]}>
          <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
            {completedPaths.map((d, i) => (
              <Path key={i} d={d} {...strokeProps} />
            ))}
            {currentD ? <Path d={currentD} {...strokeProps} /> : null}
          </Svg>
          {!hasContent && (
            <View style={styles.placeholder} pointerEvents="none">
              <Text style={styles.placeholderText}>Firma aquí</Text>
            </View>
          )}
        </View>
      </GestureDetector>
    );
  },
);

SignaturePad.displayName = 'SignaturePad';

const styles = StyleSheet.create({
  canvas: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    overflow: 'hidden',
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 15,
    color: '#c0c0c0',
    fontStyle: 'italic',
  },
});

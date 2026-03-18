'use client'

import { animate, motion, useMotionValue } from "framer-motion";
import React, { useRef, useState } from "react";
import { useGesture } from "react-use-gesture";

interface CropState {
  x: number;
  y: number;
  scale: number;
}

interface CalcState {
  x: number;
  B: number;
  extra: number;
  sqrt: number;
  result: number;
}

interface ImageCropperProps {
  src: string;
  crop: CropState;
  onCropChange: (crop: CropState) => void;
  onCalcChange: (calc: CalcState) => void;
}

export default function Home() {
  let [crop, setCrop] = useState({ x: 0, y: 0, scale: 1 });
  const [calc, setCalc] = useState({
    x: 0,
    B: 0,
    extra: 0,
    sqrt: 0,
    result: 0,
  });

  return (
    <>
      <p className="mt-4 text-lg text-center">Muhammad Ahmed (B23110006082)</p>
      <div className="p-8 flex flex-col items-center">
        <div>
          <ImageCropper src="/thumb.jpg" crop={crop} onCropChange={setCrop} onCalcChange={setCalc} />
        </div>
        <div className="mt-6">
          <p>Crop X: {Math.round(crop.x)}</p>
          <p>Crop Y: {Math.round(crop.y)}</p>
          <p>Crop Scale: {Math.round(crop.scale * 100) / 100}</p>
          <div className="mt-4 text-sm">
          </div>
        </div>
      </div>
    </>
  );
}

function ImageCropper({ src, crop, onCropChange, onCalcChange }: ImageCropperProps) {
  let x = useMotionValue(crop.x);
  let y = useMotionValue(crop.y);
  let scale = useMotionValue(crop.scale);
  let [isDragging, setIsDragging] = useState(false);
  let [isPinching, setIsPinching] = useState(false);

  let imageRef = useRef<HTMLImageElement>(null);
  let imageContainerRef = useRef<HTMLDivElement>(null);
  useGesture(
    {
      onDrag: ({ dragging, movement: [dx, dy] }) => {
        setIsDragging(dragging);
        x.stop();
        y.stop();

        if (!imageRef.current || !imageContainerRef.current) return;
        let imageBounds = imageRef.current.getBoundingClientRect();
        let containerBounds = imageContainerRef.current.getBoundingClientRect();
        let originalWidth = imageRef.current.clientWidth;
        let widthOverhang = (imageBounds.width - originalWidth) / 2;
        let originalHeight = imageRef.current.clientHeight;
        let heightOverhang = (imageBounds.height - originalHeight) / 2;
        let maxX = widthOverhang;
        let minX = -(imageBounds.width - containerBounds.width) + widthOverhang;
        let maxY = heightOverhang;
        let minY =
          -(imageBounds.height - containerBounds.height) + heightOverhang;

        x.set(dampen(dx, [minX, maxX], onCalcChange));
        y.set(dampen(dy, [minY, maxY], onCalcChange));
      },

      onPinch: ({
        pinching,
        event,
        memo,
        origin: [pinchOriginX, pinchOriginY],
        offset: [d],
      }) => {
        event.preventDefault();
        setIsPinching(pinching);
        x.stop();
        y.stop();

        if (!imageRef.current || !imageContainerRef.current) return memo;
        memo ??= {
          bounds: imageRef.current.getBoundingClientRect(),
          crop: { x: x.get(), y: y.get(), scale: scale.get() },
        };

        let transformOriginX = memo.bounds.x + memo.bounds.width / 2;
        let transformOriginY = memo.bounds.y + memo.bounds.height / 2;

        let displacementX = (transformOriginX - pinchOriginX) / memo.crop.scale;
        let displacementY = (transformOriginY - pinchOriginY) / memo.crop.scale;

        let initialOffsetDistance = (memo.crop.scale - 1) * 200;
        let movementDistance = d - initialOffsetDistance;

        scale.set(1 + d / 200);
        x.set(memo.crop.x + (displacementX * movementDistance) / 200);
        y.set(memo.crop.y + (displacementY * movementDistance) / 200);

        return memo;
      },

      onDragEnd: maybeAdjustImage,
      onPinchEnd: maybeAdjustImage,
    },
    {
      drag: {
        initial: () => [x.get(), y.get()],
      },
      pinch: {
        distanceBounds: { min: 0 },
      },
      domTarget: imageRef as React.RefObject<EventTarget>,
      eventOptions: { passive: false },
    }
  );

  function maybeAdjustImage() {
    if (!imageRef.current || !imageContainerRef.current) return;
    let newCrop = { x: x.get(), y: y.get(), scale: scale.get() };
    let imageBounds = imageRef.current.getBoundingClientRect();
    let containerBounds = imageContainerRef.current.getBoundingClientRect();
    let originalWidth = imageRef.current.clientWidth;
    let widthOverhang = (imageBounds.width - originalWidth) / 2;
    let originalHeight = imageRef.current.clientHeight;
    let heightOverhang = (imageBounds.height - originalHeight) / 2;

    if (imageBounds.left > containerBounds.left) {
      newCrop.x = widthOverhang;
    } else if (imageBounds.right < containerBounds.right) {
      newCrop.x = -(imageBounds.width - containerBounds.width) + widthOverhang;
    }

    if (imageBounds.top > containerBounds.top) {
      newCrop.y = heightOverhang;
    } else if (imageBounds.bottom < containerBounds.bottom) {
      newCrop.y =
        -(imageBounds.height - containerBounds.height) + heightOverhang;
    }

    animate(x, newCrop.x, {
      type: "tween",
      duration: 0.4,
      ease: [0.25, 1, 0.5, 1],
    });
    animate(y, newCrop.y, {
      type: "tween",
      duration: 0.4,
      ease: [0.25, 1, 0.5, 1],
    });
    onCropChange(newCrop);
  }

  return (
    <>
      <div
        className={`relative overflow-hidden bg-black ring-4 w-80 h-96 ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        } ring-white`}
      >
        <div ref={imageContainerRef} className="absolute inset-0">
          <motion.img
            src={src}
            ref={imageRef}
            style={{
              x: x,
              y: y,
              scale: scale,
              touchAction: "none",
              userSelect: "none",
              MozUserSelect: "none",
            }}
            draggable={false}
            className="relative w-auto h-full max-w-none max-h-none"
          />
          <div
            className={`pointer-events-none absolute inset-0 transition duration-300 ${
              isDragging || isPinching ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="absolute inset-0 flex flex-col">
              <div className="self-stretch flex-1 border-b border-gray-50 "></div>
              <div className="self-stretch flex-1 border-b border-gray-50 "></div>
              <div className="self-stretch flex-1"></div>
            </div>
            <div className="absolute inset-0 flex">
              <div className="self-stretch flex-1 border-r border-gray-50 "></div>
              <div className="self-stretch flex-1 border-r border-gray-50 "></div>
              <div className="self-stretch flex-1"></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function dampen(val: number, [min, max]: [number, number], report: (calc: CalcState) => void) {
  let B, extra, sqrt, result;

  if (val > max) {
    B = max;
    extra = val - B;
    sqrt = Math.sqrt(extra);
    result = B + sqrt * 2;

  } else if (val < min) {
    B = min;
    extra = val - B;
    sqrt = -Math.sqrt(-extra);
    result = B + sqrt * 2;

  } else {
    B = val;
    extra = 0;
    sqrt = 0;
    result = val;
  }

  if (report) {
    report({
      x: val,
      B,
      extra,
      sqrt,
      result,
    });
  }

  return result;
}
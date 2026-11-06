"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useSpring } from '@react-spring/three';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { useFocus } from '@/context/FocusContext';
import type { Vec3 } from '@/context/DeskLayout';

const CAM_RIGHT = new THREE.Vector3(1, 0, 0);
const CAM_UP = new THREE.Vector3(0, Math.cos(0.318), -Math.sin(0.318));
const IDENTITY_QUAT = new THREE.Quaternion();
const qYaw = new THREE.Quaternion();
const qPitch = new THREE.Quaternion();
const localRight = new THREE.Vector3();
const localUp = new THREE.Vector3();

interface InspectableOptions {
  id: string;
  restPos: Vec3;
  restRot: Vec3;
  heldPos?: Vec3;
  heldRot?: Vec3;
  heldScale?: number;
}

/**
 * Shared 3D pickup & drag-to-inspect controller.
 * - Uses window-level pointer listeners during active drags so moving outside the 3D mesh
 *   silhouette never drops events or leaves pointer state stuck.
 * - Deduplicates R3F multi-mesh raycast hits per native PointerEvent.
 * - Separates outer spring pose (pos/scale/base-rot) from inner pure-quaternion trackball spin
 *   so 360° inspection has zero Euler gimbal lock and shortest-arc slerps cleanly back to rest.
 */
export function useInspectable({
  id,
  restPos,
  restRot,
  heldPos = [0, 5.05, 2.2],
  heldRot = [-0.18, 0, 0],
  heldScale = 1.45,
}: InspectableOptions) {
  const { focusedItem, setFocusedItem } = useFocus();
  const isHeld = focusedItem === id;

  const spinRef = useRef<THREE.Group>(null);
  const targetQuat = useRef(new THREE.Quaternion());
  const heldRotInv = useRef(new THREE.Quaternion());
  heldRotInv.current.setFromEuler(new THREE.Euler(heldRot[0], heldRot[1], heldRot[2])).invert();
  const velocity = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const isPointerDown = useRef(false);
  const activePointerId = useRef<number | null>(null);
  const startPointer = useRef({ x: 0, y: 0 });
  const lastPointer = useRef({ x: 0, y: 0 });
  const lastMoveTime = useRef(0);
  const lastNativeDown = useRef<Event | null>(null);
  const hoveredObjects = useRef(new Set<THREE.Object3D>());

  const [hovered, setHovered] = useState(false);
  const [grabbing, setGrabbing] = useState(false);

  useCursor(
    hovered || grabbing,
    grabbing ? 'grabbing' : isHeld ? 'grab' : 'pointer',
    'auto',
  );

  const [{ pos, scale, rot }, api] = useSpring(() => ({
    pos: restPos,
    scale: [1, 1, 1] as Vec3,
    rot: restRot,
    config: { mass: 1, tension: 210, friction: 28 },
  }));

  useEffect(() => {
    if (!isHeld) {
      targetQuat.current.identity();
      velocity.current.x = 0;
      velocity.current.y = 0;
      isPointerDown.current = false;
      isDragging.current = false;
      activePointerId.current = null;
      setGrabbing(false);
    }

    api.start({
      pos: isHeld ? heldPos : restPos,
      scale: isHeld ? ([heldScale, heldScale, heldScale] as Vec3) : ([1, 1, 1] as Vec3),
      rot: isHeld ? heldRot : restRot,
    });
  }, [isHeld, api, heldPos[0], heldPos[1], heldPos[2], heldRot[0], heldRot[1], heldRot[2], heldScale, restPos[0], restPos[1], restPos[2], restRot[0], restRot[1], restRot[2]]);

  // Window-level pointer tracking prevents dropped drags when cursor leaves the mesh silhouette
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!isPointerDown.current) return;
      if (activePointerId.current !== null && e.pointerId !== activePointerId.current) return;

      const totalDist = Math.hypot(e.clientX - startPointer.current.x, e.clientY - startPointer.current.y);

      if (!isHeld) {
        if (totalDist > 14) isDragging.current = true;
        return;
      }

      if (!isDragging.current && totalDist > 4) {
        isDragging.current = true;
        setGrabbing(true);
      }

      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      lastPointer.current.x = e.clientX;
      lastPointer.current.y = e.clientY;

      const now = performance.now();
      const dtMs = Math.max(8, Math.min(64, now - lastMoveTime.current));
      lastMoveTime.current = now;

      const sensitivity = 0.0065;
      localUp.copy(CAM_UP).applyQuaternion(heldRotInv.current);
      localRight.copy(CAM_RIGHT).applyQuaternion(heldRotInv.current);
      qYaw.setFromAxisAngle(localUp, dx * sensitivity);
      qPitch.setFromAxisAngle(localRight, dy * sensitivity);
      targetQuat.current.premultiply(qYaw).premultiply(qPitch).normalize();

      // Convert pixel velocity to angular rad/sec with mild smoothing
      const vx = (dy * sensitivity) / (dtMs / 1000);
      const vy = (dx * sensitivity) / (dtMs / 1000);
      velocity.current.x = velocity.current.x * 0.35 + vx * 0.65;
      velocity.current.y = velocity.current.y * 0.35 + vy * 0.65;
    };

    const finishPointer = (e?: PointerEvent) => {
      if (!isPointerDown.current) return;
      if (e && activePointerId.current !== null && e.pointerId !== activePointerId.current) return;

      const wasDragging = isDragging.current;
      isPointerDown.current = false;
      activePointerId.current = null;
      setGrabbing(false);

      // If pointer paused >80ms before release, don't fling with stale velocity
      if (performance.now() - lastMoveTime.current > 80) {
        velocity.current.x = 0;
        velocity.current.y = 0;
      }

      if (!wasDragging) {
        setFocusedItem(isHeld ? null : id);
      }
    };

    const onBlur = () => {
      isPointerDown.current = false;
      activePointerId.current = null;
      isDragging.current = false;
      velocity.current.x = 0;
      velocity.current.y = 0;
      setGrabbing(false);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', finishPointer, { passive: true });
    window.addEventListener('pointercancel', finishPointer, { passive: true });
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', finishPointer);
      window.removeEventListener('pointercancel', finishPointer);
      window.removeEventListener('blur', onBlur);
    };
  }, [id, isHeld, setFocusedItem]);

  useFrame((_, delta) => {
    const grp = spinRef.current;
    if (!grp) return;
    const dt = Math.min(delta, 0.1);

    if (isHeld) {
      if (!isPointerDown.current) {
        const vx = velocity.current.x;
        const vy = velocity.current.y;
        if (Math.abs(vx) > 0.002 || Math.abs(vy) > 0.002) {
          localUp.copy(CAM_UP).applyQuaternion(heldRotInv.current);
          localRight.copy(CAM_RIGHT).applyQuaternion(heldRotInv.current);
          qYaw.setFromAxisAngle(localUp, vy * dt);
          qPitch.setFromAxisAngle(localRight, vx * dt);
          targetQuat.current.premultiply(qYaw).premultiply(qPitch).normalize();

          const decay = Math.exp(-5.5 * dt);
          velocity.current.x *= decay;
          velocity.current.y *= decay;
        } else {
          velocity.current.x = 0;
          velocity.current.y = 0;
        }
      }
      grp.quaternion.slerp(targetQuat.current, 1 - Math.exp(-26 * dt));
    } else if (grp.quaternion.angleTo(IDENTITY_QUAT) > 0.0005) {
      grp.quaternion.slerp(IDENTITY_QUAT, 1 - Math.exp(-12 * dt));
    }
  });

  const onPointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (lastNativeDown.current === e.nativeEvent) return;
    lastNativeDown.current = e.nativeEvent;

    isPointerDown.current = true;
    isDragging.current = false;
    activePointerId.current = e.pointerId;
    startPointer.current = { x: e.clientX, y: e.clientY };
    lastPointer.current = { x: e.clientX, y: e.clientY };
    lastMoveTime.current = performance.now();
    velocity.current.x = 0;
    velocity.current.y = 0;
  }, []);

  const onPointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    hoveredObjects.current.add(e.object);
    setHovered(true);
  }, []);

  const onPointerOut = useCallback((e: ThreeEvent<PointerEvent>) => {
    hoveredObjects.current.delete(e.object);
    if (hoveredObjects.current.size === 0) {
      setHovered(false);
    }
  }, []);

  const stopClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
  }, []);

  return {
    isHeld,
    pos,
    scale,
    rot,
    spinRef,
    groupHandlers: {
      onPointerDown,
      onPointerOver,
      onPointerOut,
      onClick: stopClick,
    },
  };
}

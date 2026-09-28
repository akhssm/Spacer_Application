import { describe, expect, it } from 'vitest'
import {
  MAX_FOV,
  MAX_THROW,
  MAX_VFOV,
  MIN_FOV,
  clampPitch,
  conePath,
  decay,
  degreesPerPixel,
  direction,
  pinchFov,
  pitchLimit,
  planHeading,
  shownHorizontalFov,
  throwVelocity,
  verticalFov,
  wheelFov,
  wrapYaw,
} from '@/components/explore/tour/look'

const close = (a, b) => expect(Math.abs(a - b)).toBeLessThan(1e-6)

describe('panorama look maths', () => {
  it('wraps yaw into (-180, 180]', () => {
    expect(wrapYaw(190)).toBe(-170)
    expect(wrapYaw(-190)).toBe(170)
    expect(wrapYaw(180)).toBe(180)
    expect(wrapYaw(-180)).toBe(180)
    expect(wrapYaw(720 + 45)).toBe(45)
  })

  it('keeps the view edge from passing the poles', () => {
    expect(pitchLimit(80)).toBe(50)
    expect(clampPitch(89, 80)).toBe(50)
    expect(clampPitch(-89, 80)).toBe(-50)
    expect(clampPitch(10, 80)).toBe(10)
  })

  it('derives the vertical field from the horizontal one, capped', () => {
    close(verticalFov(90, 1), 90)
    expect(verticalFov(90, 0.46)).toBe(MAX_VFOV)
    expect(verticalFov(90, 16 / 9)).toBeLessThan(90)
    // Portrait phone: the cap narrows what is actually shown sideways.
    expect(shownHorizontalFov(90, 0.46)).toBeLessThan(90)
    close(shownHorizontalFov(80, 16 / 9), 80)
  })

  it('zooms within limits', () => {
    expect(pinchFov(80, 100, 200)).toBe(40)
    expect(pinchFov(80, 200, 100)).toBe(MAX_FOV)
    expect(pinchFov(80, 100, 1000)).toBe(MIN_FOV)
    expect(wheelFov(80, 100)).toBeGreaterThan(80)
    expect(wheelFov(80, -100)).toBeLessThan(80)
    expect(wheelFov(MAX_FOV, 1000)).toBe(MAX_FOV)
  })

  it('moves the image with the pointer', () => {
    expect(degreesPerPixel(90, 900)).toBe(0.1)
  })

  it('points yaw 0 down -Z and yaw 90 to +X', () => {
    const [x0, , z0] = direction(0, 0)
    close(x0, 0)
    close(z0, -1)
    const [x1, , z1] = direction(90, 0)
    close(x1, 1)
    close(z1, 0)
    close(direction(0, 90)[1], 1)
  })

  it('caps the throw from bursty pointer events', () => {
    expect(throwVelocity(30, 1)).toBe(MAX_THROW)
    expect(throwVelocity(-2, 16)).toBe(-125)
  })

  it('lets inertia die out', () => {
    expect(decay(100, 0.1)).toBeLessThan(100)
    expect(decay(0.4, 0.016)).toBe(0)
  })

  it('turns a panorama yaw into a plan heading', () => {
    expect(planHeading(30, 0)).toBe(30)
    expect(planHeading(0, 90)).toBe(-90)
    expect(conePath(0, 0, 10, 0, 90)).toMatch(/^M 0.0 0.0 L -7.1 -7.1 A 10 10 0 0 1 7.1 -7.1 Z$/)
  })
})

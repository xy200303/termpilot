var __defProp = Object.defineProperty;
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var _t2, _e2, _a, _b;
typeof window < "u" && (window.__svelte || (window.__svelte = { v: /* @__PURE__ */ new Set() })).v.add("5");
const rr = 2, sr = "[", nr = "]", Ze = {}, W = Symbol(), ii = false, Q = 2, vi = 4, Et = 8, Ht = 16, xe = 32, ze = 64, ht = 128, Y = 256, bt = 512, H = 1024, ye = 2048, Ie = 4096, pt = 8192, kt = 16384, or = 32768, ar = 65536, lr = 1 << 19, wi = 1 << 20, ut = Symbol("$state"), ur = Symbol("legacy props");
var mi = Array.isArray, dr = Array.prototype.indexOf, cr = Array.from, vt = Object.keys, wt = Object.defineProperty, Be = Object.getOwnPropertyDescriptor, fr = Object.getOwnPropertyDescriptors, hr = Object.prototype, br = Array.prototype, gi = Object.getPrototypeOf;
function _i(t) {
  for (var e = 0; e < t.length; e++)
    t[e]();
}
let Qe = [], zt = [];
function xi() {
  var t = Qe;
  Qe = [], _i(t);
}
function pr() {
  var t = zt;
  zt = [], _i(t);
}
function jt(t) {
  Qe.length === 0 && queueMicrotask(xi), Qe.push(t);
}
function ri() {
  Qe.length > 0 && xi(), zt.length > 0 && pr();
}
function yi(t) {
  return t === this.v;
}
function vr(t, e) {
  return t != t ? e == e : t !== e || t !== null && typeof t == "object" || typeof t == "function";
}
function wr(t) {
  return !vr(t, this.v);
}
function mr(t) {
  throw new Error("https://svelte.dev/e/effect_in_teardown");
}
function gr() {
  throw new Error("https://svelte.dev/e/effect_in_unowned_derived");
}
function _r(t) {
  throw new Error("https://svelte.dev/e/effect_orphan");
}
function xr() {
  throw new Error("https://svelte.dev/e/effect_update_depth_exceeded");
}
function yr() {
  throw new Error("https://svelte.dev/e/hydration_failed");
}
function Cr() {
  throw new Error("https://svelte.dev/e/state_descriptors_fixed");
}
function Er() {
  throw new Error("https://svelte.dev/e/state_prototype_fixed");
}
function kr() {
  throw new Error("https://svelte.dev/e/state_unsafe_local_read");
}
function Sr() {
  throw new Error("https://svelte.dev/e/state_unsafe_mutation");
}
let Dr = false;
function oe(t, e) {
  var i = {
    f: 0,
    // TODO ideally we could skip this altogether, but it causes type errors
    v: t,
    reactions: null,
    equals: yi,
    rv: 0,
    wv: 0
  };
  return i;
}
function Mt(t) {
  return /* @__PURE__ */ Tr(oe(t));
}
// @__NO_SIDE_EFFECTS__
function Ci(t, e = false) {
  const i = oe(t);
  return e || (i.equals = wr), i;
}
// @__NO_SIDE_EFFECTS__
function Tr(t) {
  return k !== null && !J && (k.f & Q) !== 0 && (ae === null ? Lr([t]) : ae.push(t)), t;
}
function q(t, e) {
  return k !== null && !J && Hi() && (k.f & (Q | Ht)) !== 0 && // If the source was created locally within the current derived, then
  // we allow the mutation.
  (ae === null || !ae.includes(t)) && Sr(), Rr(t, e);
}
function Rr(t, e) {
  return t.equals(e) || (t.v, t.v = e, t.wv = Mi(), Ei(t, ye), T !== null && (T.f & H) !== 0 && (T.f & (xe | ze)) === 0 && (de === null ? Mr([t]) : de.push(t))), e;
}
function Ei(t, e) {
  var i = t.reactions;
  if (i !== null)
    for (var r = i.length, s = 0; s < r; s++) {
      var o = i[s], d = o.f;
      (d & ye) === 0 && (fe(o, e), (d & (H | Y)) !== 0 && ((d & Q) !== 0 ? Ei(
        /** @type {Derived} */
        o,
        Ie
      ) : Zt(
        /** @type {Effect} */
        o
      )));
    }
}
// @__NO_SIDE_EFFECTS__
function ki(t) {
  var e = Q | ye, i = k !== null && (k.f & Q) !== 0 ? (
    /** @type {Derived} */
    k
  ) : null;
  return T === null || i !== null && (i.f & Y) !== 0 ? e |= Y : T.f |= wi, {
    ctx: B,
    deps: null,
    effects: null,
    equals: yi,
    f: e,
    fn: t,
    reactions: null,
    rv: 0,
    v: (
      /** @type {V} */
      null
    ),
    wv: 0,
    parent: i ?? T
  };
}
function Si(t) {
  var e = t.effects;
  if (e !== null) {
    t.effects = null;
    for (var i = 0; i < e.length; i += 1)
      _e(
        /** @type {Effect} */
        e[i]
      );
  }
}
function $r(t) {
  for (var e = t.parent; e !== null; ) {
    if ((e.f & Q) === 0)
      return (
        /** @type {Effect} */
        e
      );
    e = e.parent;
  }
  return null;
}
function Ar(t) {
  var e, i = T;
  ge($r(t));
  try {
    Si(t), e = Pi(t);
  } finally {
    ge(i);
  }
  return e;
}
function Di(t) {
  var e = Ar(t), i = (we || (t.f & Y) !== 0) && t.deps !== null ? Ie : H;
  fe(t, i), t.equals(e) || (t.v = e, t.wv = Mi());
}
function Gt(t) {
  console.warn("https://svelte.dev/e/hydration_mismatch");
}
let ee = false;
function ot(t) {
  ee = t;
}
let I;
function mt(t) {
  if (t === null)
    throw Gt(), Ze;
  return I = t;
}
function Ti() {
  return mt(
    /** @type {TemplateNode} */
    /* @__PURE__ */ St(I)
  );
}
function Ft(t) {
  if (ee) {
    if (/* @__PURE__ */ St(I) !== null)
      throw Gt(), Ze;
    I = t;
  }
}
function Te(t, e = null, i) {
  if (typeof t != "object" || t === null || ut in t)
    return t;
  const r = gi(t);
  if (r !== hr && r !== br)
    return t;
  var s = /* @__PURE__ */ new Map(), o = mi(t), d = oe(0);
  o && s.set("length", oe(
    /** @type {any[]} */
    t.length
  ));
  var b;
  return new Proxy(
    /** @type {any} */
    t,
    {
      defineProperty(c, p, h) {
        (!("value" in h) || h.configurable === false || h.enumerable === false || h.writable === false) && Cr();
        var w = s.get(p);
        return w === void 0 ? (w = oe(h.value), s.set(p, w)) : q(w, Te(h.value, b)), true;
      },
      deleteProperty(c, p) {
        var h = s.get(p);
        if (h === void 0)
          p in c && s.set(p, oe(W));
        else {
          if (o && typeof p == "string") {
            var w = (
              /** @type {Source<number>} */
              s.get("length")
            ), n = Number(p);
            Number.isInteger(n) && n < w.v && q(w, n);
          }
          q(h, W), si(d);
        }
        return true;
      },
      get(c, p, h) {
        var _a2;
        if (p === ut)
          return t;
        var w = s.get(p), n = p in c;
        if (w === void 0 && (!n || ((_a2 = Be(c, p)) == null ? void 0 : _a2.writable)) && (w = oe(Te(n ? c[p] : W, b)), s.set(p, w)), w !== void 0) {
          var l = U(w);
          return l === W ? void 0 : l;
        }
        return Reflect.get(c, p, h);
      },
      getOwnPropertyDescriptor(c, p) {
        var h = Reflect.getOwnPropertyDescriptor(c, p);
        if (h && "value" in h) {
          var w = s.get(p);
          w && (h.value = U(w));
        } else if (h === void 0) {
          var n = s.get(p), l = n == null ? void 0 : n.v;
          if (n !== void 0 && l !== W)
            return {
              enumerable: true,
              configurable: true,
              value: l,
              writable: true
            };
        }
        return h;
      },
      has(c, p) {
        var _a2;
        if (p === ut)
          return true;
        var h = s.get(p), w = h !== void 0 && h.v !== W || Reflect.has(c, p);
        if (h !== void 0 || T !== null && (!w || ((_a2 = Be(c, p)) == null ? void 0 : _a2.writable))) {
          h === void 0 && (h = oe(w ? Te(c[p], b) : W), s.set(p, h));
          var n = U(h);
          if (n === W)
            return false;
        }
        return w;
      },
      set(c, p, h, w) {
        var _a2;
        var n = s.get(p), l = p in c;
        if (o && p === "length")
          for (var a = h; a < /** @type {Source<number>} */
          n.v; a += 1) {
            var u = s.get(a + "");
            u !== void 0 ? q(u, W) : a in c && (u = oe(W), s.set(a + "", u));
          }
        n === void 0 ? (!l || ((_a2 = Be(c, p)) == null ? void 0 : _a2.writable)) && (n = oe(void 0), q(n, Te(h, b)), s.set(p, n)) : (l = n.v !== W, q(n, Te(h, b)));
        var f = Reflect.getOwnPropertyDescriptor(c, p);
        if ((f == null ? void 0 : f.set) && f.set.call(w, h), !l) {
          if (o && typeof p == "string") {
            var $ = (
              /** @type {Source<number>} */
              s.get("length")
            ), O = Number(p);
            Number.isInteger(O) && O >= $.v && q($, O + 1);
          }
          si(d);
        }
        return true;
      },
      ownKeys(c) {
        U(d);
        var p = Reflect.ownKeys(c).filter((n) => {
          var l = s.get(n);
          return l === void 0 || l.v !== W;
        });
        for (var [h, w] of s)
          w.v !== W && !(h in c) && p.push(h);
        return p;
      },
      setPrototypeOf() {
        Er();
      }
    }
  );
}
function si(t, e = 1) {
  q(t, t.v + e);
}
var ni, Ri, $i, Ai;
function It() {
  if (ni === void 0) {
    ni = window, Ri = /Firefox/.test(navigator.userAgent);
    var t = Element.prototype, e = Node.prototype;
    $i = Be(e, "firstChild").get, Ai = Be(e, "nextSibling").get, t.__click = void 0, t.__className = void 0, t.__attributes = null, t.__styles = null, t.__e = void 0, Text.prototype.__t = void 0;
  }
}
function Oi(t = "") {
  return document.createTextNode(t);
}
// @__NO_SIDE_EFFECTS__
function gt(t) {
  return $i.call(t);
}
// @__NO_SIDE_EFFECTS__
function St(t) {
  return Ai.call(t);
}
function Pt(t, e) {
  if (!ee)
    return /* @__PURE__ */ gt(t);
  var i = (
    /** @type {TemplateNode} */
    /* @__PURE__ */ gt(I)
  );
  return i === null && (i = I.appendChild(Oi())), mt(i), i;
}
function Or(t) {
  t.textContent = "";
}
let dt = false, _t = false, xt = null, ct = false, Yt = false;
function oi(t) {
  Yt = t;
}
let Je = [];
let k = null, J = false;
function me(t) {
  k = t;
}
let T = null;
function ge(t) {
  T = t;
}
let ae = null;
function Lr(t) {
  ae = t;
}
let N = null, K = 0, de = null;
function Mr(t) {
  de = t;
}
let Li = 1, yt = 0, we = false;
function Mi() {
  return ++Li;
}
function Dt(t) {
  var _a2;
  var e = t.f;
  if ((e & ye) !== 0)
    return true;
  if ((e & Ie) !== 0) {
    var i = t.deps, r = (e & Y) !== 0;
    if (i !== null) {
      var s, o, d = (e & bt) !== 0, b = r && T !== null && !we, c = i.length;
      if (d || b) {
        var p = (
          /** @type {Derived} */
          t
        ), h = p.parent;
        for (s = 0; s < c; s++)
          o = i[s], (d || !((_a2 = o == null ? void 0 : o.reactions) == null ? void 0 : _a2.includes(p))) && (o.reactions ?? (o.reactions = [])).push(p);
        d && (p.f ^= bt), b && h !== null && (h.f & Y) === 0 && (p.f ^= Y);
      }
      for (s = 0; s < c; s++)
        if (o = i[s], Dt(
          /** @type {Derived} */
          o
        ) && Di(
          /** @type {Derived} */
          o
        ), o.wv > t.wv)
          return true;
    }
    (!r || T !== null && !we) && fe(t, H);
  }
  return false;
}
function Fr(t, e) {
  for (var i = e; i !== null; ) {
    if ((i.f & ht) !== 0)
      try {
        i.fn(t);
        return;
      } catch {
        i.f ^= ht;
      }
    i = i.parent;
  }
  throw dt = false, t;
}
function Pr(t) {
  return (t.f & kt) === 0 && (t.parent === null || (t.parent.f & ht) === 0);
}
function Tt(t, e, i, r) {
  if (dt) {
    if (i === null && (dt = false), Pr(e))
      throw t;
    return;
  }
  i !== null && (dt = true);
  {
    Fr(t, e);
    return;
  }
}
function Fi(t, e, i = true) {
  var r = t.reactions;
  if (r !== null)
    for (var s = 0; s < r.length; s++) {
      var o = r[s];
      (o.f & Q) !== 0 ? Fi(
        /** @type {Derived} */
        o,
        e,
        false
      ) : e === o && (i ? fe(o, ye) : (o.f & H) !== 0 && fe(o, Ie), Zt(
        /** @type {Effect} */
        o
      ));
    }
}
function Pi(t) {
  var _a2;
  var e = N, i = K, r = de, s = k, o = we, d = ae, b = B, c = J, p = t.f;
  N = /** @type {null | Value[]} */
  null, K = 0, de = null, we = (p & Y) !== 0 && (J || !ct || k === null), k = (p & (xe | ze)) === 0 ? t : null, ae = null, ai(t.ctx), J = false, yt++;
  try {
    var h = (
      /** @type {Function} */
      (0, t.fn)()
    ), w = t.deps;
    if (N !== null) {
      var n;
      if (Ct(t, K), w !== null && K > 0)
        for (w.length = K + N.length, n = 0; n < N.length; n++)
          w[K + n] = N[n];
      else
        t.deps = w = N;
      if (!we)
        for (n = K; n < w.length; n++)
          ((_a2 = w[n]).reactions ?? (_a2.reactions = [])).push(t);
    } else w !== null && K < w.length && (Ct(t, K), w.length = K);
    if (Hi() && de !== null && !J && w !== null && (t.f & (Q | Ie | ye)) === 0)
      for (n = 0; n < /** @type {Source[]} */
      de.length; n++)
        Fi(
          de[n],
          /** @type {Effect} */
          t
        );
    return s !== null && yt++, h;
  } finally {
    N = e, K = i, de = r, k = s, we = o, ae = d, ai(b), J = c;
  }
}
function Nr(t, e) {
  let i = e.reactions;
  if (i !== null) {
    var r = dr.call(i, t);
    if (r !== -1) {
      var s = i.length - 1;
      s === 0 ? i = e.reactions = null : (i[r] = i[s], i.pop());
    }
  }
  i === null && (e.f & Q) !== 0 && // Destroying a child effect while updating a parent effect can cause a dependency to appear
  // to be unused, when in fact it is used by the currently-updating parent. Checking `new_deps`
  // allows us to skip the expensive work of disconnecting and immediately reconnecting it
  (N === null || !N.includes(e)) && (fe(e, Ie), (e.f & (Y | bt)) === 0 && (e.f ^= bt), Si(
    /** @type {Derived} **/
    e
  ), Ct(
    /** @type {Derived} **/
    e,
    0
  ));
}
function Ct(t, e) {
  var i = t.deps;
  if (i !== null)
    for (var r = e; r < i.length; r++)
      Nr(t, i[r]);
}
function Xt(t) {
  var e = t.f;
  if ((e & kt) === 0) {
    fe(t, H);
    var i = T, r = B, s = ct;
    T = t, ct = true;
    try {
      (e & Ht) !== 0 ? Zr(t) : zi(t), Bi(t);
      var o = Pi(t);
      t.teardown = typeof o == "function" ? o : null, t.wv = Li;
      var d = t.deps, b;
      ii && Dr && t.f & ye;
    } catch (c) {
      Tt(c, t, i, r || t.ctx);
    } finally {
      ct = s, T = i;
    }
  }
}
function Ur() {
  try {
    xr();
  } catch (t) {
    if (xt !== null)
      Tt(t, xt, null);
    else
      throw t;
  }
}
function Ni() {
  try {
    for (var t = 0; Je.length > 0; ) {
      t++ > 1e3 && Ur();
      var e = Je, i = e.length;
      Je = [];
      for (var r = 0; r < i; r++) {
        var s = e[r];
        (s.f & H) === 0 && (s.f ^= H);
        var o = zr(s);
        Br(o);
      }
    }
  } finally {
    _t = false, xt = null;
  }
}
function Br(t) {
  var e = t.length;
  if (e !== 0)
    for (var i = 0; i < e; i++) {
      var r = t[i];
      if ((r.f & (kt | pt)) === 0)
        try {
          Dt(r) && (Xt(r), r.deps === null && r.first === null && r.nodes_start === null && (r.teardown === null ? Ii(r) : r.fn = null));
        } catch (s) {
          Tt(s, r, null, r.ctx);
        }
    }
}
function Zt(t) {
  _t || (_t = true, queueMicrotask(Ni));
  for (var e = xt = t; e.parent !== null; ) {
    e = e.parent;
    var i = e.f;
    if ((i & (ze | xe)) !== 0) {
      if ((i & H) === 0) return;
      e.f ^= H;
    }
  }
  Je.push(e);
}
function zr(t) {
  for (var e = [], i = t.first; i !== null; ) {
    var r = i.f, s = (r & xe) !== 0, o = s && (r & H) !== 0;
    if (!o && (r & pt) === 0) {
      if ((r & vi) !== 0)
        e.push(i);
      else if (s)
        i.f ^= H;
      else {
        var d = k;
        try {
          k = i, Dt(i) && Xt(i);
        } catch (p) {
          Tt(p, i, null, i.ctx);
        } finally {
          k = d;
        }
      }
      var b = i.first;
      if (b !== null) {
        i = b;
        continue;
      }
    }
    var c = i.parent;
    for (i = i.next; i === null && c !== null; )
      i = c.next, c = c.parent;
  }
  return e;
}
function je(t) {
  var e;
  for (ri(); Je.length > 0; )
    _t = true, Ni(), ri();
  return (
    /** @type {T} */
    e
  );
}
function U(t) {
  var e = t.f, i = (e & Q) !== 0;
  if (k !== null && !J) {
    ae !== null && ae.includes(t) && kr();
    var r = k.deps;
    t.rv < yt && (t.rv = yt, N === null && r !== null && r[K] === t ? K++ : N === null ? N = [t] : (!we || !N.includes(t)) && N.push(t));
  } else if (i && /** @type {Derived} */
  t.deps === null && /** @type {Derived} */
  t.effects === null) {
    var s = (
      /** @type {Derived} */
      t
    ), o = s.parent;
    o !== null && (o.f & Y) === 0 && (s.f ^= Y);
  }
  return i && (s = /** @type {Derived} */
  t, Dt(s) && Di(s)), t.v;
}
function Rt(t) {
  var e = J;
  try {
    return J = true, t();
  } finally {
    J = e;
  }
}
const Ir = -7169;
function fe(t, e) {
  t.f = t.f & Ir | e;
}
function Wr(t) {
  T === null && k === null && _r(), k !== null && (k.f & Y) !== 0 && T === null && gr(), Yt && mr();
}
function Vr(t, e) {
  var i = e.last;
  i === null ? e.last = e.first = t : (i.next = t, t.prev = i, e.last = t);
}
function Re(t, e, i, r = true) {
  var s = (t & ze) !== 0, o = T, d = {
    ctx: B,
    deps: null,
    nodes_start: null,
    nodes_end: null,
    f: t | ye,
    first: null,
    fn: e,
    last: null,
    next: null,
    parent: s ? null : o,
    prev: null,
    teardown: null,
    transitions: null,
    wv: 0
  };
  if (i)
    try {
      Xt(d), d.f |= or;
    } catch (p) {
      throw _e(d), p;
    }
  else e !== null && Zt(d);
  var b = i && d.deps === null && d.first === null && d.nodes_start === null && d.teardown === null && (d.f & (wi | ht)) === 0;
  if (!b && !s && r && (o !== null && Vr(d, o), k !== null && (k.f & Q) !== 0)) {
    var c = (
      /** @type {Derived} */
      k
    );
    (c.effects ?? (c.effects = [])).push(d);
  }
  return d;
}
function Kr(t) {
  const e = Re(Et, null, false);
  return fe(e, H), e.teardown = t, e;
}
function qr(t) {
  Wr();
  var e = T !== null && (T.f & xe) !== 0 && B !== null && !B.m;
  if (e) {
    var i = (
      /** @type {ComponentContext} */
      B
    );
    (i.e ?? (i.e = [])).push({
      fn: t,
      effect: T,
      reaction: k
    });
  } else {
    var r = Jt(t);
    return r;
  }
}
function Hr(t) {
  const e = Re(ze, t, true);
  return () => {
    _e(e);
  };
}
function jr(t) {
  const e = Re(ze, t, true);
  return (i = {}) => new Promise((r) => {
    i.outro ? Jr(e, () => {
      _e(e), r(void 0);
    }) : (_e(e), r(void 0));
  });
}
function Jt(t) {
  return Re(vi, t, false);
}
function Ui(t) {
  return Re(Et, t, true);
}
function Gr(t, e = [], i = ki) {
  const r = e.map(i);
  return Yr(() => t(...r.map(U)));
}
function Yr(t, e = 0) {
  return Re(Et | Ht | e, t, true);
}
function Xr(t, e = true) {
  return Re(Et | xe, t, true, e);
}
function Bi(t) {
  var e = t.teardown;
  if (e !== null) {
    const i = Yt, r = k;
    oi(true), me(null);
    try {
      e.call(null);
    } finally {
      oi(i), me(r);
    }
  }
}
function zi(t, e = false) {
  var i = t.first;
  for (t.first = t.last = null; i !== null; ) {
    var r = i.next;
    _e(i, e), i = r;
  }
}
function Zr(t) {
  for (var e = t.first; e !== null; ) {
    var i = e.next;
    (e.f & xe) === 0 && _e(e), e = i;
  }
}
function _e(t, e = true) {
  var i = false;
  if ((e || (t.f & lr) !== 0) && t.nodes_start !== null) {
    for (var r = t.nodes_start, s = t.nodes_end; r !== null; ) {
      var o = r === s ? null : (
        /** @type {TemplateNode} */
        /* @__PURE__ */ St(r)
      );
      r.remove(), r = o;
    }
    i = true;
  }
  zi(t, e && !i), Ct(t, 0), fe(t, kt);
  var d = t.transitions;
  if (d !== null)
    for (const c of d)
      c.stop();
  Bi(t);
  var b = t.parent;
  b !== null && b.first !== null && Ii(t), t.next = t.prev = t.teardown = t.ctx = t.deps = t.fn = t.nodes_start = t.nodes_end = null;
}
function Ii(t) {
  var e = t.parent, i = t.prev, r = t.next;
  i !== null && (i.next = r), r !== null && (r.prev = i), e !== null && (e.first === t && (e.first = r), e.last === t && (e.last = i));
}
function Jr(t, e) {
  var i = [];
  Wi(t, i, true), Qr(i, () => {
    _e(t), e && e();
  });
}
function Qr(t, e) {
  var i = t.length;
  if (i > 0) {
    var r = () => --i || e();
    for (var s of t)
      s.out(r);
  } else
    e();
}
function Wi(t, e, i) {
  if ((t.f & pt) === 0) {
    if (t.f ^= pt, t.transitions !== null)
      for (const d of t.transitions)
        (d.is_global || i) && e.push(d);
    for (var r = t.first; r !== null; ) {
      var s = r.next, o = (r.f & ar) !== 0 || (r.f & xe) !== 0;
      Wi(r, e, o ? i : false), r = s;
    }
  }
}
function Vi(t) {
  throw new Error("https://svelte.dev/e/lifecycle_outside_component");
}
let B = null;
function ai(t) {
  B = t;
}
function Ki(t, e = false, i) {
  B = {
    p: B,
    c: null,
    e: null,
    m: false,
    s: t,
    x: null,
    l: null
  };
}
function qi(t) {
  const e = B;
  if (e !== null) {
    t !== void 0 && (e.x = t);
    const d = e.e;
    if (d !== null) {
      var i = T, r = k;
      e.e = null;
      try {
        for (var s = 0; s < d.length; s++) {
          var o = d[s];
          ge(o.effect), me(o.reaction), Jt(o.fn);
        }
      } finally {
        ge(i), me(r);
      }
    }
    B = e.p, e.m = true;
  }
  return t || /** @type {T} */
  {};
}
function Hi() {
  return true;
}
const es = ["touchstart", "touchmove"];
function ts(t) {
  return es.includes(t);
}
function is(t) {
  var e = k, i = T;
  me(null), ge(null);
  try {
    return t();
  } finally {
    me(e), ge(i);
  }
}
const ji = /* @__PURE__ */ new Set(), Wt = /* @__PURE__ */ new Set();
function rs(t, e, i, r = {}) {
  function s(o) {
    if (r.capture || Ge.call(e, o), !o.cancelBubble)
      return is(() => i == null ? void 0 : i.call(this, o));
  }
  return t.startsWith("pointer") || t.startsWith("touch") || t === "wheel" ? jt(() => {
    e.addEventListener(t, s, r);
  }) : e.addEventListener(t, s, r), s;
}
function at(t, e, i, r, s) {
  var o = { capture: r, passive: s }, d = rs(t, e, i, o);
  (e === document.body || e === window || e === document) && Kr(() => {
    e.removeEventListener(t, d, o);
  });
}
function ss(t) {
  for (var e = 0; e < t.length; e++)
    ji.add(t[e]);
  for (var i of Wt)
    i(t);
}
function Ge(t) {
  var _a2;
  var e = this, i = (
    /** @type {Node} */
    e.ownerDocument
  ), r = t.type, s = ((_a2 = t.composedPath) == null ? void 0 : _a2.call(t)) || [], o = (
    /** @type {null | Element} */
    s[0] || t.target
  ), d = 0, b = t.__root;
  if (b) {
    var c = s.indexOf(b);
    if (c !== -1 && (e === document || e === /** @type {any} */
    window)) {
      t.__root = e;
      return;
    }
    var p = s.indexOf(e);
    if (p === -1)
      return;
    c <= p && (d = c);
  }
  if (o = /** @type {Element} */
  s[d] || t.target, o !== e) {
    wt(t, "currentTarget", {
      configurable: true,
      get() {
        return o || i;
      }
    });
    var h = k, w = T;
    me(null), ge(null);
    try {
      for (var n, l = []; o !== null; ) {
        var a = o.assignedSlot || o.parentNode || /** @type {any} */
        o.host || null;
        try {
          var u = o["__" + r];
          if (u !== void 0 && (!/** @type {any} */
          o.disabled || // DOM could've been updated already by the time this is reached, so we check this as well
          // -> the target could not have been disabled because it emits the event in the first place
          t.target === o))
            if (mi(u)) {
              var [f, ...$] = u;
              f.apply(o, [t, ...$]);
            } else
              u.call(o, t);
        } catch (O) {
          n ? l.push(O) : n = O;
        }
        if (t.cancelBubble || a === e || a === null)
          break;
        o = a;
      }
      if (n) {
        for (let O of l)
          queueMicrotask(() => {
            throw O;
          });
        throw n;
      }
    } finally {
      t.__root = e, delete t.currentTarget, me(h), ge(w);
    }
  }
}
function ns(t) {
  var e = document.createElement("template");
  return e.innerHTML = t, e.content;
}
function Vt(t, e) {
  var i = (
    /** @type {Effect} */
    T
  );
  i.nodes_start === null && (i.nodes_start = t, i.nodes_end = e);
}
// @__NO_SIDE_EFFECTS__
function os(t, e) {
  var i = (e & rr) !== 0, r, s = !t.startsWith("<!>");
  return () => {
    if (ee)
      return Vt(I, null), I;
    r === void 0 && (r = ns(s ? t : "<!>" + t), r = /** @type {Node} */
    /* @__PURE__ */ gt(r));
    var o = (
      /** @type {TemplateNode} */
      i || Ri ? document.importNode(r, true) : r.cloneNode(true)
    );
    return Vt(o, o), o;
  };
}
function Gi(t, e) {
  if (ee) {
    T.nodes_end = I, Ti();
    return;
  }
  t !== null && t.before(
    /** @type {Node} */
    e
  );
}
function Yi(t, e) {
  return Xi(t, e);
}
function as(t, e) {
  It(), e.intro = e.intro ?? false;
  const i = e.target, r = ee, s = I;
  try {
    for (var o = (
      /** @type {TemplateNode} */
      /* @__PURE__ */ gt(i)
    ); o && (o.nodeType !== 8 || /** @type {Comment} */
    o.data !== sr); )
      o = /** @type {TemplateNode} */
      /* @__PURE__ */ St(o);
    if (!o)
      throw Ze;
    ot(true), mt(
      /** @type {Comment} */
      o
    ), Ti();
    const d = Xi(t, { ...e, anchor: o });
    if (I === null || I.nodeType !== 8 || /** @type {Comment} */
    I.data !== nr)
      throw Gt(), Ze;
    return ot(false), /**  @type {Exports} */
    d;
  } catch (d) {
    if (d === Ze)
      return e.recover === false && yr(), It(), Or(i), ot(false), Yi(t, e);
    throw d;
  } finally {
    ot(r), mt(s);
  }
}
const Ne = /* @__PURE__ */ new Map();
function Xi(t, { target: e, anchor: i, props: r = {}, events: s, context: o, intro: d = true }) {
  It();
  var b = /* @__PURE__ */ new Set(), c = (w) => {
    for (var n = 0; n < w.length; n++) {
      var l = w[n];
      if (!b.has(l)) {
        b.add(l);
        var a = ts(l);
        e.addEventListener(l, Ge, { passive: a });
        var u = Ne.get(l);
        u === void 0 ? (document.addEventListener(l, Ge, { passive: a }), Ne.set(l, 1)) : Ne.set(l, u + 1);
      }
    }
  };
  c(cr(ji)), Wt.add(c);
  var p = void 0, h = jr(() => {
    var w = i ?? e.appendChild(Oi());
    return Xr(() => {
      if (o) {
        Ki({});
        var n = (
          /** @type {ComponentContext} */
          B
        );
        n.c = o;
      }
      s && (r.$$events = s), ee && Vt(
        /** @type {TemplateNode} */
        w,
        null
      ), p = t(w, r) || {}, ee && (T.nodes_end = I), o && qi();
    }), () => {
      var _a2;
      for (var n of b) {
        e.removeEventListener(n, Ge);
        var l = (
          /** @type {number} */
          Ne.get(n)
        );
        --l === 0 ? (document.removeEventListener(n, Ge), Ne.delete(n)) : Ne.set(n, l);
      }
      Wt.delete(c), w !== i && ((_a2 = w.parentNode) == null ? void 0 : _a2.removeChild(w));
    };
  });
  return Kt.set(p, h), p;
}
let Kt = /* @__PURE__ */ new WeakMap();
function ls(t, e) {
  const i = Kt.get(t);
  return i ? (Kt.delete(t), i(e)) : Promise.resolve();
}
function us(t, e) {
  jt(() => {
    var i = t.getRootNode(), r = (
      /** @type {ShadowRoot} */
      i.host ? (
        /** @type {ShadowRoot} */
        i
      ) : (
        /** @type {Document} */
        i.head ?? /** @type {Document} */
        i.ownerDocument.head
      )
    );
    if (!r.querySelector("#" + e.hash)) {
      const s = document.createElement("style");
      s.id = e.hash, s.textContent = e.code, r.appendChild(s);
    }
  });
}
const li = [...` 	
\r\f\xA0\v\uFEFF`];
function ds(t, e, i) {
  var r = t == null ? "" : "" + t;
  if (r = r ? r + " " + e : e, i) {
    for (var s in i)
      if (i[s])
        r = r ? r + " " + s : s;
      else if (r.length)
        for (var o = s.length, d = 0; (d = r.indexOf(s, d)) >= 0; ) {
          var b = d + o;
          (d === 0 || li.includes(r[d - 1])) && (b === r.length || li.includes(r[b])) ? r = (d === 0 ? "" : r.substring(0, d)) + r.substring(b + 1) : d = b;
        }
  }
  return r === "" ? null : r;
}
function cs(t, e, i, r, s, o) {
  var d = t.__className;
  if (ee || d !== i) {
    var b = ds(i, r, o);
    (!ee || b !== t.getAttribute("class")) && (b == null ? t.removeAttribute("class") : t.className = b), t.__className = i;
  } else if (o)
    for (var c in o) {
      var p = !!o[c];
      (s == null || p !== !!s[c]) && t.classList.toggle(c, p);
    }
  return o;
}
function ui(t, e, i, r) {
  var s = t.__attributes ?? (t.__attributes = {});
  ee && (s[e] = t.getAttribute(e)), s[e] !== (s[e] = i) && ("__styles" in t && (t.__styles = {}), i == null ? t.removeAttribute(e) : typeof i != "string" && fs(t).includes(e) ? t[e] = i : t.setAttribute(e, i));
}
var di = /* @__PURE__ */ new Map();
function fs(t) {
  var e = di.get(t.nodeName);
  if (e) return e;
  di.set(t.nodeName, e = []);
  for (var i, r = t, s = Element.prototype; s !== r; ) {
    i = fr(r);
    for (var o in i)
      i[o].set && e.push(o);
    r = gi(r);
  }
  return e;
}
function ci(t, e) {
  return t === e || (t == null ? void 0 : t[ut]) === e;
}
function Nt(t = {}, e, i, r) {
  return Jt(() => {
    var s, o;
    return Ui(() => {
      s = o, o = [], Rt(() => {
        t !== i(...o) && (e(t, ...o), s && ci(i(...s), t) && e(null, ...s));
      });
    }), () => {
      jt(() => {
        o && ci(i(...o), t) && e(null, ...o);
      });
    };
  }), t;
}
function Zi(t) {
  B === null && Vi(), qr(() => {
    const e = Rt(t);
    if (typeof e == "function") return (
      /** @type {() => void} */
      e
    );
  });
}
function hs(t) {
  B === null && Vi(), Zi(() => () => Rt(t));
}
function lt(t, e, i, r) {
  var s;
  s = /** @type {V} */
  t[e];
  var o = (
    /** @type {V} */
    r
  ), d = true, b = false, c = () => (b = true, d && (d = false, o = /** @type {V} */
  r), o), p;
  p = () => {
    var l = (
      /** @type {V} */
      t[e]
    );
    return l === void 0 ? c() : (d = true, b = false, l);
  };
  var h = false, w = /* @__PURE__ */ Ci(s), n = /* @__PURE__ */ ki(() => {
    var l = p(), a = U(w);
    return h ? (h = false, a) : w.v = l;
  });
  return function(l, a) {
    if (arguments.length > 0) {
      const u = a ? U(n) : l;
      return n.equals(u) || (h = true, q(w, u), b && o !== void 0 && (o = u), Rt(() => U(n))), l;
    }
    return U(n);
  };
}
function bs(t) {
  return new ps(t);
}
class ps {
  /**
   * @param {ComponentConstructorOptions & {
   *  component: any;
   * }} options
   */
  constructor(e) {
    /** @type {any} */
    __privateAdd(this, _t2);
    /** @type {Record<string, any>} */
    __privateAdd(this, _e2);
    var _a2;
    var i = /* @__PURE__ */ new Map(), r = (o, d) => {
      var b = /* @__PURE__ */ Ci(d);
      return i.set(o, b), b;
    };
    const s = new Proxy(
      { ...e.props || {}, $$events: {} },
      {
        get(o, d) {
          return U(i.get(d) ?? r(d, Reflect.get(o, d)));
        },
        has(o, d) {
          return d === ur ? true : (U(i.get(d) ?? r(d, Reflect.get(o, d))), Reflect.has(o, d));
        },
        set(o, d, b) {
          return q(i.get(d) ?? r(d, b), b), Reflect.set(o, d, b);
        }
      }
    );
    __privateSet(this, _e2, (e.hydrate ? as : Yi)(e.component, {
      target: e.target,
      anchor: e.anchor,
      props: s,
      context: e.context,
      intro: e.intro ?? false,
      recover: e.recover
    })), (!((_a2 = e == null ? void 0 : e.props) == null ? void 0 : _a2.$$host) || e.sync === false) && je(), __privateSet(this, _t2, s.$$events);
    for (const o of Object.keys(__privateGet(this, _e2)))
      o === "$set" || o === "$destroy" || o === "$on" || wt(this, o, {
        get() {
          return __privateGet(this, _e2)[o];
        },
        /** @param {any} value */
        set(d) {
          __privateGet(this, _e2)[o] = d;
        },
        enumerable: true
      });
    __privateGet(this, _e2).$set = /** @param {Record<string, any>} next */
    (o) => {
      Object.assign(s, o);
    }, __privateGet(this, _e2).$destroy = () => {
      ls(__privateGet(this, _e2));
    };
  }
  /** @param {Record<string, any>} props */
  $set(e) {
    __privateGet(this, _e2).$set(e);
  }
  /**
   * @param {string} event
   * @param {(...args: any[]) => any} callback
   * @returns {any}
   */
  $on(e, i) {
    __privateGet(this, _t2)[e] = __privateGet(this, _t2)[e] || [];
    const r = (...s) => i.call(this, ...s);
    return __privateGet(this, _t2)[e].push(r), () => {
      __privateGet(this, _t2)[e] = __privateGet(this, _t2)[e].filter(
        /** @param {any} fn */
        (s) => s !== r
      );
    };
  }
  $destroy() {
    __privateGet(this, _e2).$destroy();
  }
}
_t2 = new WeakMap();
_e2 = new WeakMap();
let Ji;
typeof HTMLElement == "function" && (Ji = class extends HTMLElement {
  /**
   * @param {*} $$componentCtor
   * @param {*} $$slots
   * @param {*} use_shadow_dom
   */
  constructor(t, e, i) {
    super();
    /** The Svelte component constructor */
    __publicField(this, "$$ctor");
    /** Slots */
    __publicField(this, "$$s");
    /** @type {any} The Svelte component instance */
    __publicField(this, "$$c");
    /** Whether or not the custom element is connected */
    __publicField(this, "$$cn", false);
    /** @type {Record<string, any>} Component props data */
    __publicField(this, "$$d", {});
    /** `true` if currently in the process of reflecting component props back to attributes */
    __publicField(this, "$$r", false);
    /** @type {Record<string, CustomElementPropDefinition>} Props definition (name, reflected, type etc) */
    __publicField(this, "$$p_d", {});
    /** @type {Record<string, EventListenerOrEventListenerObject[]>} Event listeners */
    __publicField(this, "$$l", {});
    /** @type {Map<EventListenerOrEventListenerObject, Function>} Event listener unsubscribe functions */
    __publicField(this, "$$l_u", /* @__PURE__ */ new Map());
    /** @type {any} The managed render effect for reflecting attributes */
    __publicField(this, "$$me");
    this.$$ctor = t, this.$$s = e, i && this.attachShadow({ mode: "open" });
  }
  /**
   * @param {string} type
   * @param {EventListenerOrEventListenerObject} listener
   * @param {boolean | AddEventListenerOptions} [options]
   */
  addEventListener(t, e, i) {
    if (this.$$l[t] = this.$$l[t] || [], this.$$l[t].push(e), this.$$c) {
      const r = this.$$c.$on(t, e);
      this.$$l_u.set(e, r);
    }
    super.addEventListener(t, e, i);
  }
  /**
   * @param {string} type
   * @param {EventListenerOrEventListenerObject} listener
   * @param {boolean | AddEventListenerOptions} [options]
   */
  removeEventListener(t, e, i) {
    if (super.removeEventListener(t, e, i), this.$$c) {
      const r = this.$$l_u.get(e);
      r && (r(), this.$$l_u.delete(e));
    }
  }
  async connectedCallback() {
    if (this.$$cn = true, !this.$$c) {
      let t = function(r) {
        return (s) => {
          const o = document.createElement("slot");
          r !== "default" && (o.name = r), Gi(s, o);
        };
      };
      if (await Promise.resolve(), !this.$$cn || this.$$c)
        return;
      const e = {}, i = vs(this);
      for (const r of this.$$s)
        r in i && (r === "default" && !this.$$d.children ? (this.$$d.children = t(r), e.default = true) : e[r] = t(r));
      for (const r of this.attributes) {
        const s = this.$$g_p(r.name);
        s in this.$$d || (this.$$d[s] = ft(s, r.value, this.$$p_d, "toProp"));
      }
      for (const r in this.$$p_d)
        !(r in this.$$d) && this[r] !== void 0 && (this.$$d[r] = this[r], delete this[r]);
      this.$$c = bs({
        component: this.$$ctor,
        target: this.shadowRoot || this,
        props: {
          ...this.$$d,
          $$slots: e,
          $$host: this
        }
      }), this.$$me = Hr(() => {
        Ui(() => {
          var _a2;
          this.$$r = true;
          for (const r of vt(this.$$c)) {
            if (!((_a2 = this.$$p_d[r]) == null ? void 0 : _a2.reflect)) continue;
            this.$$d[r] = this.$$c[r];
            const s = ft(
              r,
              this.$$d[r],
              this.$$p_d,
              "toAttribute"
            );
            s == null ? this.removeAttribute(this.$$p_d[r].attribute || r) : this.setAttribute(this.$$p_d[r].attribute || r, s);
          }
          this.$$r = false;
        });
      });
      for (const r in this.$$l)
        for (const s of this.$$l[r]) {
          const o = this.$$c.$on(r, s);
          this.$$l_u.set(s, o);
        }
      this.$$l = {};
    }
  }
  // We don't need this when working within Svelte code, but for compatibility of people using this outside of Svelte
  // and setting attributes through setAttribute etc, this is helpful
  /**
   * @param {string} attr
   * @param {string} _oldValue
   * @param {string} newValue
   */
  attributeChangedCallback(t, e, i) {
    var _a2;
    this.$$r || (t = this.$$g_p(t), this.$$d[t] = ft(t, i, this.$$p_d, "toProp"), (_a2 = this.$$c) == null ? void 0 : _a2.$set({ [t]: this.$$d[t] }));
  }
  disconnectedCallback() {
    this.$$cn = false, Promise.resolve().then(() => {
      !this.$$cn && this.$$c && (this.$$c.$destroy(), this.$$me(), this.$$c = void 0);
    });
  }
  /**
   * @param {string} attribute_name
   */
  $$g_p(t) {
    return vt(this.$$p_d).find(
      (e) => this.$$p_d[e].attribute === t || !this.$$p_d[e].attribute && e.toLowerCase() === t
    ) || t;
  }
});
function ft(t, e, i, r) {
  var _a2;
  const s = (_a2 = i[t]) == null ? void 0 : _a2.type;
  if (e = s === "Boolean" && typeof e != "boolean" ? e != null : e, !r || !i[t])
    return e;
  if (r === "toAttribute")
    switch (s) {
      case "Object":
      case "Array":
        return e == null ? null : JSON.stringify(e);
      case "Boolean":
        return e ? "" : null;
      case "Number":
        return e ?? null;
      default:
        return e;
    }
  else
    switch (s) {
      case "Object":
      case "Array":
        return e && JSON.parse(e);
      case "Boolean":
        return e;
      // conversion already handled above
      case "Number":
        return e != null ? +e : e;
      default:
        return e;
    }
}
function vs(t) {
  const e = {};
  return t.childNodes.forEach((i) => {
    e[
      /** @type {Element} node */
      i.slot || "default"
    ] = true;
  }), e;
}
function ws(t, e, i, r, s, o) {
  let d = class extends Ji {
    constructor() {
      super(t, i, s), this.$$p_d = e;
    }
    static get observedAttributes() {
      return vt(e).map(
        (b) => (e[b].attribute || b).toLowerCase()
      );
    }
  };
  return vt(e).forEach((b) => {
    wt(d.prototype, b, {
      get() {
        return this.$$c && b in this.$$c ? this.$$c[b] : this.$$d[b];
      },
      set(c) {
        var _a2;
        c = ft(b, c, e), this.$$d[b] = c;
        var p = this.$$c;
        if (p) {
          var h = (_a2 = Be(p, b)) == null ? void 0 : _a2.get;
          h ? p[b] = c : p.$set({ [b]: c });
        }
      }
    });
  }), r.forEach((b) => {
    wt(d.prototype, b, {
      get() {
        var _a2;
        return (_a2 = this.$$c) == null ? void 0 : _a2[b];
      }
    });
  }), o && (d = o(d)), t.element = /** @type {any} */
  d, d;
}
class ms {
  constructor() {
    __publicField(this, "verbose", false);
  }
  info(e) {
    this.verbose && console.log(e);
  }
  error(e, i) {
    this.verbose && console.error(e, i);
  }
}
const F = new ms();
function gs(t) {
  return t && t.__esModule && Object.prototype.hasOwnProperty.call(t, "default") ? t.default : t;
}
var Ye = { exports: {} }, _s = Ye.exports, fi;
function xs() {
  return fi || (fi = 1, (function(t, e) {
    (function(i, r) {
      var s = "1.0.41", o = "", d = "?", b = "function", c = "undefined", p = "object", h = "string", w = "major", n = "model", l = "name", a = "type", u = "vendor", f = "version", $ = "architecture", O = "console", m = "mobile", _ = "tablet", M = "smarttv", P = "wearable", te = "embedded", le = 500, Ce = "Amazon", he = "Apple", et = "ASUS", tt = "BlackBerry", ie = "Browser", $e = "Chrome", $t = "Edge", Ae = "Firefox", Oe = "Google", We = "Honor", it = "Huawei", At = "Lenovo", Le = "LG", Ve = "Microsoft", Ee = "Motorola", Ke = "Nvidia", rt = "OnePlus", be = "Opera", Me = "OPPO", pe = "Samsung", ke = "Sharp", X = "Sony", Fe = "Xiaomi", Se = "Zebra", j = "Facebook", v = "Chromium OS", S = "Mac OS", A = " Browser", R = function(y, C) {
        var x = {};
        for (var D in y)
          C[D] && C[D].length % 2 === 0 ? x[D] = C[D].concat(y[D]) : x[D] = y[D];
        return x;
      }, L = function(y) {
        for (var C = {}, x = 0; x < y.length; x++)
          C[y[x].toUpperCase()] = y[x];
        return C;
      }, z = function(y, C) {
        return typeof y === h ? G(C).indexOf(G(y)) !== -1 : false;
      }, G = function(y) {
        return y.toLowerCase();
      }, st = function(y) {
        return typeof y === h ? y.replace(/[^\d\.]/g, o).split(".")[0] : r;
      }, Ot = function(y, C) {
        if (typeof y === h)
          return y = y.replace(/^\s\s*/, o), typeof C === c ? y : y.substring(0, le);
      }, qe = function(y, C) {
        for (var x = 0, D, ue, re, E, g, se; x < C.length && !g; ) {
          var Lt = C[x], ti = C[x + 1];
          for (D = ue = 0; D < Lt.length && !g && Lt[D]; )
            if (g = Lt[D++].exec(y), g)
              for (re = 0; re < ti.length; re++)
                se = g[++ue], E = ti[re], typeof E === p && E.length > 0 ? E.length === 2 ? typeof E[1] == b ? this[E[0]] = E[1].call(this, se) : this[E[0]] = E[1] : E.length === 3 ? typeof E[1] === b && !(E[1].exec && E[1].test) ? this[E[0]] = se ? E[1].call(this, se, E[2]) : r : this[E[0]] = se ? se.replace(E[1], E[2]) : r : E.length === 4 && (this[E[0]] = se ? E[3].call(this, se.replace(E[1], E[2])) : r) : this[E] = se || r;
          x += 2;
        }
      }, He = function(y, C) {
        for (var x in C)
          if (typeof C[x] === p && C[x].length > 0) {
            for (var D = 0; D < C[x].length; D++)
              if (z(C[x][D], y))
                return x === d ? r : x;
          } else if (z(C[x], y))
            return x === d ? r : x;
        return C.hasOwnProperty("*") ? C["*"] : y;
      }, ir = {
        "1.0": "/8",
        "1.2": "/1",
        "1.3": "/3",
        "2.0": "/412",
        "2.0.2": "/416",
        "2.0.3": "/417",
        "2.0.4": "/419",
        "?": "/"
      }, Qt = {
        ME: "4.90",
        "NT 3.11": "NT3.51",
        "NT 4.0": "NT4.0",
        2e3: "NT 5.0",
        XP: ["NT 5.1", "NT 5.2"],
        Vista: "NT 6.0",
        7: "NT 6.1",
        8: "NT 6.2",
        "8.1": "NT 6.3",
        10: ["NT 6.4", "NT 10.0"],
        RT: "ARM"
      }, ei = {
        browser: [
          [
            /\b(?:crmo|crios)\/([\w\.]+)/i
            // Chrome for Android/iOS
          ],
          [f, [l, "Chrome"]],
          [
            /edg(?:e|ios|a)?\/([\w\.]+)/i
            // Microsoft Edge
          ],
          [f, [l, "Edge"]],
          [
            // Presto based
            /(opera mini)\/([-\w\.]+)/i,
            // Opera Mini
            /(opera [mobiletab]{3,6})\b.+version\/([-\w\.]+)/i,
            // Opera Mobi/Tablet
            /(opera)(?:.+version\/|[\/ ]+)([\w\.]+)/i
            // Opera
          ],
          [l, f],
          [
            /opios[\/ ]+([\w\.]+)/i
            // Opera mini on iphone >= 8.0
          ],
          [f, [l, be + " Mini"]],
          [
            /\bop(?:rg)?x\/([\w\.]+)/i
            // Opera GX
          ],
          [f, [l, be + " GX"]],
          [
            /\bopr\/([\w\.]+)/i
            // Opera Webkit
          ],
          [f, [l, be]],
          [
            // Mixed
            /\bb[ai]*d(?:uhd|[ub]*[aekoprswx]{5,6})[\/ ]?([\w\.]+)/i
            // Baidu
          ],
          [f, [l, "Baidu"]],
          [
            /\b(?:mxbrowser|mxios|myie2)\/?([-\w\.]*)\b/i
            // Maxthon
          ],
          [f, [l, "Maxthon"]],
          [
            /(kindle)\/([\w\.]+)/i,
            // Kindle
            /(lunascape|maxthon|netfront|jasmine|blazer|sleipnir)[\/ ]?([\w\.]*)/i,
            // Lunascape/Maxthon/Netfront/Jasmine/Blazer/Sleipnir
            // Trident based
            /(avant|iemobile|slim(?:browser|boat|jet))[\/ ]?([\d\.]*)/i,
            // Avant/IEMobile/SlimBrowser/SlimBoat/Slimjet
            /(?:ms|\()(ie) ([\w\.]+)/i,
            // Internet Explorer
            // Blink/Webkit/KHTML based                                         // Flock/RockMelt/Midori/Epiphany/Silk/Skyfire/Bolt/Iron/Iridium/PhantomJS/Bowser/QupZilla/Falkon
            /(flock|rockmelt|midori|epiphany|silk|skyfire|ovibrowser|bolt|iron|vivaldi|iridium|phantomjs|bowser|qupzilla|falkon|rekonq|puffin|brave|whale(?!.+naver)|qqbrowserlite|duckduckgo|klar|helio|(?=comodo_)?dragon)\/([-\w\.]+)/i,
            // Rekonq/Puffin/Brave/Whale/QQBrowserLite/QQ//Vivaldi/DuckDuckGo/Klar/Helio/Dragon
            /(heytap|ovi|115)browser\/([\d\.]+)/i,
            // HeyTap/Ovi/115
            /(weibo)__([\d\.]+)/i
            // Weibo
          ],
          [l, f],
          [
            /quark(?:pc)?\/([-\w\.]+)/i
            // Quark
          ],
          [f, [l, "Quark"]],
          [
            /\bddg\/([\w\.]+)/i
            // DuckDuckGo
          ],
          [f, [l, "DuckDuckGo"]],
          [
            /(?:\buc? ?browser|(?:juc.+)ucweb)[\/ ]?([\w\.]+)/i
            // UCBrowser
          ],
          [f, [l, "UC" + ie]],
          [
            /microm.+\bqbcore\/([\w\.]+)/i,
            // WeChat Desktop for Windows Built-in Browser
            /\bqbcore\/([\w\.]+).+microm/i,
            /micromessenger\/([\w\.]+)/i
            // WeChat
          ],
          [f, [l, "WeChat"]],
          [
            /konqueror\/([\w\.]+)/i
            // Konqueror
          ],
          [f, [l, "Konqueror"]],
          [
            /trident.+rv[: ]([\w\.]{1,9})\b.+like gecko/i
            // IE11
          ],
          [f, [l, "IE"]],
          [
            /ya(?:search)?browser\/([\w\.]+)/i
            // Yandex
          ],
          [f, [l, "Yandex"]],
          [
            /slbrowser\/([\w\.]+)/i
            // Smart Lenovo Browser
          ],
          [f, [l, "Smart Lenovo " + ie]],
          [
            /(avast|avg)\/([\w\.]+)/i
            // Avast/AVG Secure Browser
          ],
          [[l, /(.+)/, "$1 Secure " + ie], f],
          [
            /\bfocus\/([\w\.]+)/i
            // Firefox Focus
          ],
          [f, [l, Ae + " Focus"]],
          [
            /\bopt\/([\w\.]+)/i
            // Opera Touch
          ],
          [f, [l, be + " Touch"]],
          [
            /coc_coc\w+\/([\w\.]+)/i
            // Coc Coc Browser
          ],
          [f, [l, "Coc Coc"]],
          [
            /dolfin\/([\w\.]+)/i
            // Dolphin
          ],
          [f, [l, "Dolphin"]],
          [
            /coast\/([\w\.]+)/i
            // Opera Coast
          ],
          [f, [l, be + " Coast"]],
          [
            /miuibrowser\/([\w\.]+)/i
            // MIUI Browser
          ],
          [f, [l, "MIUI" + A]],
          [
            /fxios\/([\w\.-]+)/i
            // Firefox for iOS
          ],
          [f, [l, Ae]],
          [
            /\bqihoobrowser\/?([\w\.]*)/i
            // 360
          ],
          [f, [l, "360"]],
          [
            /\b(qq)\/([\w\.]+)/i
            // QQ
          ],
          [[l, /(.+)/, "$1Browser"], f],
          [
            /(oculus|sailfish|huawei|vivo|pico)browser\/([\w\.]+)/i
          ],
          [[l, /(.+)/, "$1" + A], f],
          [
            // Oculus/Sailfish/HuaweiBrowser/VivoBrowser/PicoBrowser
            /samsungbrowser\/([\w\.]+)/i
            // Samsung Internet
          ],
          [f, [l, pe + " Internet"]],
          [
            /metasr[\/ ]?([\d\.]+)/i
            // Sogou Explorer
          ],
          [f, [l, "Sogou Explorer"]],
          [
            /(sogou)mo\w+\/([\d\.]+)/i
            // Sogou Mobile
          ],
          [[l, "Sogou Mobile"], f],
          [
            /(electron)\/([\w\.]+) safari/i,
            // Electron-based App
            /(tesla)(?: qtcarbrowser|\/(20\d\d\.[-\w\.]+))/i,
            // Tesla
            /m?(qqbrowser|2345(?=browser|chrome|explorer))\w*[\/ ]?v?([\w\.]+)/i
            // QQ/2345
          ],
          [l, f],
          [
            /(lbbrowser|rekonq)/i,
            // LieBao Browser/Rekonq
            /\[(linkedin)app\]/i
            // LinkedIn App for iOS & Android
          ],
          [l],
          [
            /ome\/([\w\.]+) \w* ?(iron) saf/i,
            // Iron
            /ome\/([\w\.]+).+qihu (360)[es]e/i
            // 360
          ],
          [f, l],
          [
            // WebView
            /((?:fban\/fbios|fb_iab\/fb4a)(?!.+fbav)|;fbav\/([\w\.]+);)/i
            // Facebook App for iOS & Android
          ],
          [[l, j], f],
          [
            /(Klarna)\/([\w\.]+)/i,
            // Klarna Shopping Browser for iOS & Android
            /(kakao(?:talk|story))[\/ ]([\w\.]+)/i,
            // Kakao App
            /(naver)\(.*?(\d+\.[\w\.]+).*\)/i,
            // Naver InApp
            /(daum)apps[\/ ]([\w\.]+)/i,
            // Daum App
            /safari (line)\/([\w\.]+)/i,
            // Line App for iOS
            /\b(line)\/([\w\.]+)\/iab/i,
            // Line App for Android
            /(alipay)client\/([\w\.]+)/i,
            // Alipay
            /(twitter)(?:and| f.+e\/([\w\.]+))/i,
            // Twitter
            /(chromium|instagram|snapchat)[\/ ]([-\w\.]+)/i
            // Chromium/Instagram/Snapchat
          ],
          [l, f],
          [
            /\bgsa\/([\w\.]+) .*safari\//i
            // Google Search Appliance on iOS
          ],
          [f, [l, "GSA"]],
          [
            /musical_ly(?:.+app_?version\/|_)([\w\.]+)/i
            // TikTok
          ],
          [f, [l, "TikTok"]],
          [
            /headlesschrome(?:\/([\w\.]+)| )/i
            // Chrome Headless
          ],
          [f, [l, $e + " Headless"]],
          [
            / wv\).+(chrome)\/([\w\.]+)/i
            // Chrome WebView
          ],
          [[l, $e + " WebView"], f],
          [
            /droid.+ version\/([\w\.]+)\b.+(?:mobile safari|safari)/i
            // Android Browser
          ],
          [f, [l, "Android " + ie]],
          [
            /(chrome|omniweb|arora|[tizenoka]{5} ?browser)\/v?([\w\.]+)/i
            // Chrome/OmniWeb/Arora/Tizen/Nokia
          ],
          [l, f],
          [
            /version\/([\w\.\,]+) .*mobile\/\w+ (safari)/i
            // Mobile Safari
          ],
          [f, [l, "Mobile Safari"]],
          [
            /version\/([\w(\.|\,)]+) .*(mobile ?safari|safari)/i
            // Safari & Safari Mobile
          ],
          [f, l],
          [
            /webkit.+?(mobile ?safari|safari)(\/[\w\.]+)/i
            // Safari < 3.0
          ],
          [l, [f, He, ir]],
          [
            /(webkit|khtml)\/([\w\.]+)/i
          ],
          [l, f],
          [
            // Gecko based
            /(navigator|netscape\d?)\/([-\w\.]+)/i
            // Netscape
          ],
          [[l, "Netscape"], f],
          [
            /(wolvic|librewolf)\/([\w\.]+)/i
            // Wolvic/LibreWolf
          ],
          [l, f],
          [
            /mobile vr; rv:([\w\.]+)\).+firefox/i
            // Firefox Reality
          ],
          [f, [l, Ae + " Reality"]],
          [
            /ekiohf.+(flow)\/([\w\.]+)/i,
            // Flow
            /(swiftfox)/i,
            // Swiftfox
            /(icedragon|iceweasel|camino|chimera|fennec|maemo browser|minimo|conkeror)[\/ ]?([\w\.\+]+)/i,
            // IceDragon/Iceweasel/Camino/Chimera/Fennec/Maemo/Minimo/Conkeror
            /(seamonkey|k-meleon|icecat|iceape|firebird|phoenix|palemoon|basilisk|waterfox)\/([-\w\.]+)$/i,
            // Firefox/SeaMonkey/K-Meleon/IceCat/IceApe/Firebird/Phoenix
            /(firefox)\/([\w\.]+)/i,
            // Other Firefox-based
            /(mozilla)\/([\w\.]+) .+rv\:.+gecko\/\d+/i,
            // Mozilla
            // Other
            /(amaya|dillo|doris|icab|ladybird|lynx|mosaic|netsurf|obigo|polaris|w3m|(?:go|ice|up)[\. ]?browser)[-\/ ]?v?([\w\.]+)/i,
            // Polaris/Lynx/Dillo/iCab/Doris/Amaya/w3m/NetSurf/Obigo/Mosaic/Go/ICE/UP.Browser/Ladybird
            /\b(links) \(([\w\.]+)/i
            // Links
          ],
          [l, [f, /_/g, "."]],
          [
            /(cobalt)\/([\w\.]+)/i
            // Cobalt
          ],
          [l, [f, /master.|lts./, ""]]
        ],
        cpu: [
          [
            /\b((amd|x|x86[-_]?|wow|win)64)\b/i
            // AMD64 (x64)
          ],
          [[$, "amd64"]],
          [
            /(ia32(?=;))/i,
            // IA32 (quicktime)
            /\b((i[346]|x)86)(pc)?\b/i
            // IA32 (x86)
          ],
          [[$, "ia32"]],
          [
            /\b(aarch64|arm(v?[89]e?l?|_?64))\b/i
            // ARM64
          ],
          [[$, "arm64"]],
          [
            /\b(arm(v[67])?ht?n?[fl]p?)\b/i
            // ARMHF
          ],
          [[$, "armhf"]],
          [
            // PocketPC mistakenly identified as PowerPC
            /( (ce|mobile); ppc;|\/[\w\.]+arm\b)/i
          ],
          [[$, "arm"]],
          [
            /((ppc|powerpc)(64)?)( mac|;|\))/i
            // PowerPC
          ],
          [[$, /ower/, o, G]],
          [
            / sun4\w[;\)]/i
            // SPARC
          ],
          [[$, "sparc"]],
          [
            /\b(avr32|ia64(?=;)|68k(?=\))|\barm(?=v([1-7]|[5-7]1)l?|;|eabi)|(irix|mips|sparc)(64)?\b|pa-risc)/i
            // IA64, 68K, ARM/64, AVR/32, IRIX/64, MIPS/64, SPARC/64, PA-RISC
          ],
          [[$, G]]
        ],
        device: [
          [
            //////////////////////////
            // MOBILES & TABLETS
            /////////////////////////
            // Samsung
            /\b(sch-i[89]0\d|shw-m380s|sm-[ptx]\w{2,4}|gt-[pn]\d{2,4}|sgh-t8[56]9|nexus 10)/i
          ],
          [n, [u, pe], [a, _]],
          [
            /\b((?:s[cgp]h|gt|sm)-(?![lr])\w+|sc[g-]?[\d]+a?|galaxy nexus)/i,
            /samsung[- ]((?!sm-[lr])[-\w]+)/i,
            /sec-(sgh\w+)/i
          ],
          [n, [u, pe], [a, m]],
          [
            // Apple
            /(?:\/|\()(ip(?:hone|od)[\w, ]*)(?:\/|;)/i
            // iPod/iPhone
          ],
          [n, [u, he], [a, m]],
          [
            /\((ipad);[-\w\),; ]+apple/i,
            // iPad
            /applecoremedia\/[\w\.]+ \((ipad)/i,
            /\b(ipad)\d\d?,\d\d?[;\]].+ios/i
          ],
          [n, [u, he], [a, _]],
          [
            /(macintosh);/i
          ],
          [n, [u, he]],
          [
            // Sharp
            /\b(sh-?[altvz]?\d\d[a-ekm]?)/i
          ],
          [n, [u, ke], [a, m]],
          [
            // Honor
            /\b((?:brt|eln|hey2?|gdi|jdn)-a?[lnw]09|(?:ag[rm]3?|jdn2|kob2)-a?[lw]0[09]hn)(?: bui|\)|;)/i
          ],
          [n, [u, We], [a, _]],
          [
            /honor([-\w ]+)[;\)]/i
          ],
          [n, [u, We], [a, m]],
          [
            // Huawei
            /\b((?:ag[rs][2356]?k?|bah[234]?|bg[2o]|bt[kv]|cmr|cpn|db[ry]2?|jdn2|got|kob2?k?|mon|pce|scm|sht?|[tw]gr|vrd)-[ad]?[lw][0125][09]b?|605hw|bg2-u03|(?:gem|fdr|m2|ple|t1)-[7a]0[1-4][lu]|t1-a2[13][lw]|mediapad[\w\. ]*(?= bui|\)))\b(?!.+d\/s)/i
          ],
          [n, [u, it], [a, _]],
          [
            /(?:huawei)([-\w ]+)[;\)]/i,
            /\b(nexus 6p|\w{2,4}e?-[atu]?[ln][\dx][012359c][adn]?)\b(?!.+d\/s)/i
          ],
          [n, [u, it], [a, m]],
          [
            // Xiaomi
            /oid[^\)]+; (2[\dbc]{4}(182|283|rp\w{2})[cgl]|m2105k81a?c)(?: bui|\))/i,
            /\b((?:red)?mi[-_ ]?pad[\w- ]*)(?: bui|\))/i
            // Mi Pad tablets
          ],
          [[n, /_/g, " "], [u, Fe], [a, _]],
          [
            /\b(poco[\w ]+|m2\d{3}j\d\d[a-z]{2})(?: bui|\))/i,
            // Xiaomi POCO
            /\b; (\w+) build\/hm\1/i,
            // Xiaomi Hongmi 'numeric' models
            /\b(hm[-_ ]?note?[_ ]?(?:\d\w)?) bui/i,
            // Xiaomi Hongmi
            /\b(redmi[\-_ ]?(?:note|k)?[\w_ ]+)(?: bui|\))/i,
            // Xiaomi Redmi
            /oid[^\)]+; (m?[12][0-389][01]\w{3,6}[c-y])( bui|; wv|\))/i,
            // Xiaomi Redmi 'numeric' models
            /\b(mi[-_ ]?(?:a\d|one|one[_ ]plus|note lte|max|cc)?[_ ]?(?:\d?\w?)[_ ]?(?:plus|se|lite|pro)?)(?: bui|\))/i,
            // Xiaomi Mi
            / ([\w ]+) miui\/v?\d/i
          ],
          [[n, /_/g, " "], [u, Fe], [a, m]],
          [
            // OPPO
            /; (\w+) bui.+ oppo/i,
            /\b(cph[12]\d{3}|p(?:af|c[al]|d\w|e[ar])[mt]\d0|x9007|a101op)\b/i
          ],
          [n, [u, Me], [a, m]],
          [
            /\b(opd2(\d{3}a?))(?: bui|\))/i
          ],
          [n, [u, He, { OnePlus: ["304", "403", "203"], "*": Me }], [a, _]],
          [
            // Vivo
            /vivo (\w+)(?: bui|\))/i,
            /\b(v[12]\d{3}\w?[at])(?: bui|;)/i
          ],
          [n, [u, "Vivo"], [a, m]],
          [
            // Realme
            /\b(rmx[1-3]\d{3})(?: bui|;|\))/i
          ],
          [n, [u, "Realme"], [a, m]],
          [
            // Motorola
            /\b(milestone|droid(?:[2-4x]| (?:bionic|x2|pro|razr))?:?( 4g)?)\b[\w ]+build\//i,
            /\bmot(?:orola)?[- ](\w*)/i,
            /((?:moto(?! 360)[\w\(\) ]+|xt\d{3,4}|nexus 6)(?= bui|\)))/i
          ],
          [n, [u, Ee], [a, m]],
          [
            /\b(mz60\d|xoom[2 ]{0,2}) build\//i
          ],
          [n, [u, Ee], [a, _]],
          [
            // LG
            /((?=lg)?[vl]k\-?\d{3}) bui| 3\.[-\w; ]{10}lg?-([06cv9]{3,4})/i
          ],
          [n, [u, Le], [a, _]],
          [
            /(lm(?:-?f100[nv]?|-[\w\.]+)(?= bui|\))|nexus [45])/i,
            /\blg[-e;\/ ]+((?!browser|netcast|android tv|watch)\w+)/i,
            /\blg-?([\d\w]+) bui/i
          ],
          [n, [u, Le], [a, m]],
          [
            // Lenovo
            /(ideatab[-\w ]+|602lv|d-42a|a101lv|a2109a|a3500-hv|s[56]000|pb-6505[my]|tb-?x?\d{3,4}(?:f[cu]|xu|[av])|yt\d?-[jx]?\d+[lfmx])( bui|;|\)|\/)/i,
            /lenovo ?(b[68]0[08]0-?[hf]?|tab(?:[\w- ]+?)|tb[\w-]{6,7})( bui|;|\)|\/)/i
          ],
          [n, [u, At], [a, _]],
          [
            // Nokia
            /(nokia) (t[12][01])/i
          ],
          [u, n, [a, _]],
          [
            /(?:maemo|nokia).*(n900|lumia \d+|rm-\d+)/i,
            /nokia[-_ ]?(([-\w\. ]*))/i
          ],
          [[n, /_/g, " "], [a, m], [u, "Nokia"]],
          [
            // Google
            /(pixel (c|tablet))\b/i
            // Google Pixel C/Tablet
          ],
          [n, [u, Oe], [a, _]],
          [
            /droid.+; (pixel[\daxl ]{0,6})(?: bui|\))/i
            // Google Pixel
          ],
          [n, [u, Oe], [a, m]],
          [
            // Sony
            /droid.+; (a?\d[0-2]{2}so|[c-g]\d{4}|so[-gl]\w+|xq-a\w[4-7][12])(?= bui|\).+chrome\/(?![1-6]{0,1}\d\.))/i
          ],
          [n, [u, X], [a, m]],
          [
            /sony tablet [ps]/i,
            /\b(?:sony)?sgp\w+(?: bui|\))/i
          ],
          [[n, "Xperia Tablet"], [u, X], [a, _]],
          [
            // OnePlus
            / (kb2005|in20[12]5|be20[12][59])\b/i,
            /(?:one)?(?:plus)? (a\d0\d\d)(?: b|\))/i
          ],
          [n, [u, rt], [a, m]],
          [
            // Amazon
            /(alexa)webm/i,
            /(kf[a-z]{2}wi|aeo(?!bc)\w\w)( bui|\))/i,
            // Kindle Fire without Silk / Echo Show
            /(kf[a-z]+)( bui|\)).+silk\//i
            // Kindle Fire HD
          ],
          [n, [u, Ce], [a, _]],
          [
            /((?:sd|kf)[0349hijorstuw]+)( bui|\)).+silk\//i
            // Fire Phone
          ],
          [[n, /(.+)/g, "Fire Phone $1"], [u, Ce], [a, m]],
          [
            // BlackBerry
            /(playbook);[-\w\),; ]+(rim)/i
            // BlackBerry PlayBook
          ],
          [n, u, [a, _]],
          [
            /\b((?:bb[a-f]|st[hv])100-\d)/i,
            /\(bb10; (\w+)/i
            // BlackBerry 10
          ],
          [n, [u, tt], [a, m]],
          [
            // Asus
            /(?:\b|asus_)(transfo[prime ]{4,10} \w+|eeepc|slider \w+|nexus 7|padfone|p00[cj])/i
          ],
          [n, [u, et], [a, _]],
          [
            / (z[bes]6[027][012][km][ls]|zenfone \d\w?)\b/i
          ],
          [n, [u, et], [a, m]],
          [
            // HTC
            /(nexus 9)/i
            // HTC Nexus 9
          ],
          [n, [u, "HTC"], [a, _]],
          [
            /(htc)[-;_ ]{1,2}([\w ]+(?=\)| bui)|\w+)/i,
            // HTC
            // ZTE
            /(zte)[- ]([\w ]+?)(?: bui|\/|\))/i,
            /(alcatel|geeksphone|nexian|panasonic(?!(?:;|\.))|sony(?!-bra))[-_ ]?([-\w]*)/i
            // Alcatel/GeeksPhone/Nexian/Panasonic/Sony
          ],
          [u, [n, /_/g, " "], [a, m]],
          [
            // TCL
            /droid [\w\.]+; ((?:8[14]9[16]|9(?:0(?:48|60|8[01])|1(?:3[27]|66)|2(?:6[69]|9[56])|466))[gqswx])\w*(\)| bui)/i
          ],
          [n, [u, "TCL"], [a, _]],
          [
            // itel
            /(itel) ((\w+))/i
          ],
          [[u, G], n, [a, He, { tablet: ["p10001l", "w7001"], "*": "mobile" }]],
          [
            // Acer
            /droid.+; ([ab][1-7]-?[0178a]\d\d?)/i
          ],
          [n, [u, "Acer"], [a, _]],
          [
            // Meizu
            /droid.+; (m[1-5] note) bui/i,
            /\bmz-([-\w]{2,})/i
          ],
          [n, [u, "Meizu"], [a, m]],
          [
            // Ulefone
            /; ((?:power )?armor(?:[\w ]{0,8}))(?: bui|\))/i
          ],
          [n, [u, "Ulefone"], [a, m]],
          [
            // Energizer
            /; (energy ?\w+)(?: bui|\))/i,
            /; energizer ([\w ]+)(?: bui|\))/i
          ],
          [n, [u, "Energizer"], [a, m]],
          [
            // Cat
            /; cat (b35);/i,
            /; (b15q?|s22 flip|s48c|s62 pro)(?: bui|\))/i
          ],
          [n, [u, "Cat"], [a, m]],
          [
            // Smartfren
            /((?:new )?andromax[\w- ]+)(?: bui|\))/i
          ],
          [n, [u, "Smartfren"], [a, m]],
          [
            // Nothing
            /droid.+; (a(?:015|06[35]|142p?))/i
          ],
          [n, [u, "Nothing"], [a, m]],
          [
            // Archos
            /; (x67 5g|tikeasy \w+|ac[1789]\d\w+)( b|\))/i,
            /archos ?(5|gamepad2?|([\w ]*[t1789]|hello) ?\d+[\w ]*)( b|\))/i
          ],
          [n, [u, "Archos"], [a, _]],
          [
            /archos ([\w ]+)( b|\))/i,
            /; (ac[3-6]\d\w{2,8})( b|\))/i
          ],
          [n, [u, "Archos"], [a, m]],
          [
            // MIXED
            /(imo) (tab \w+)/i,
            // IMO
            /(infinix) (x1101b?)/i
            // Infinix XPad
          ],
          [u, n, [a, _]],
          [
            /(blackberry|benq|palm(?=\-)|sonyericsson|acer|asus(?! zenw)|dell|jolla|meizu|motorola|polytron|infinix|tecno|micromax|advan)[-_ ]?([-\w]*)/i,
            // BlackBerry/BenQ/Palm/Sony-Ericsson/Acer/Asus/Dell/Meizu/Motorola/Polytron/Infinix/Tecno/Micromax/Advan
            /; (hmd|imo) ([\w ]+?)(?: bui|\))/i,
            // HMD/IMO
            /(hp) ([\w ]+\w)/i,
            // HP iPAQ
            /(microsoft); (lumia[\w ]+)/i,
            // Microsoft Lumia
            /(lenovo)[-_ ]?([-\w ]+?)(?: bui|\)|\/)/i,
            // Lenovo
            /(oppo) ?([\w ]+) bui/i
            // OPPO
          ],
          [u, n, [a, m]],
          [
            /(kobo)\s(ereader|touch)/i,
            // Kobo
            /(hp).+(touchpad(?!.+tablet)|tablet)/i,
            // HP TouchPad
            /(kindle)\/([\w\.]+)/i,
            // Kindle
            /(nook)[\w ]+build\/(\w+)/i,
            // Nook
            /(dell) (strea[kpr\d ]*[\dko])/i,
            // Dell Streak
            /(le[- ]+pan)[- ]+(\w{1,9}) bui/i,
            // Le Pan Tablets
            /(trinity)[- ]*(t\d{3}) bui/i,
            // Trinity Tablets
            /(gigaset)[- ]+(q\w{1,9}) bui/i,
            // Gigaset Tablets
            /(vodafone) ([\w ]+)(?:\)| bui)/i
            // Vodafone
          ],
          [u, n, [a, _]],
          [
            /(surface duo)/i
            // Surface Duo
          ],
          [n, [u, Ve], [a, _]],
          [
            /droid [\d\.]+; (fp\du?)(?: b|\))/i
            // Fairphone
          ],
          [n, [u, "Fairphone"], [a, m]],
          [
            /(u304aa)/i
            // AT&T
          ],
          [n, [u, "AT&T"], [a, m]],
          [
            /\bsie-(\w*)/i
            // Siemens
          ],
          [n, [u, "Siemens"], [a, m]],
          [
            /\b(rct\w+) b/i
            // RCA Tablets
          ],
          [n, [u, "RCA"], [a, _]],
          [
            /\b(venue[\d ]{2,7}) b/i
            // Dell Venue Tablets
          ],
          [n, [u, "Dell"], [a, _]],
          [
            /\b(q(?:mv|ta)\w+) b/i
            // Verizon Tablet
          ],
          [n, [u, "Verizon"], [a, _]],
          [
            /\b(?:barnes[& ]+noble |bn[rt])([\w\+ ]*) b/i
            // Barnes & Noble Tablet
          ],
          [n, [u, "Barnes & Noble"], [a, _]],
          [
            /\b(tm\d{3}\w+) b/i
          ],
          [n, [u, "NuVision"], [a, _]],
          [
            /\b(k88) b/i
            // ZTE K Series Tablet
          ],
          [n, [u, "ZTE"], [a, _]],
          [
            /\b(nx\d{3}j) b/i
            // ZTE Nubia
          ],
          [n, [u, "ZTE"], [a, m]],
          [
            /\b(gen\d{3}) b.+49h/i
            // Swiss GEN Mobile
          ],
          [n, [u, "Swiss"], [a, m]],
          [
            /\b(zur\d{3}) b/i
            // Swiss ZUR Tablet
          ],
          [n, [u, "Swiss"], [a, _]],
          [
            /\b((zeki)?tb.*\b) b/i
            // Zeki Tablets
          ],
          [n, [u, "Zeki"], [a, _]],
          [
            /\b([yr]\d{2}) b/i,
            /\b(dragon[- ]+touch |dt)(\w{5}) b/i
            // Dragon Touch Tablet
          ],
          [[u, "Dragon Touch"], n, [a, _]],
          [
            /\b(ns-?\w{0,9}) b/i
            // Insignia Tablets
          ],
          [n, [u, "Insignia"], [a, _]],
          [
            /\b((nxa|next)-?\w{0,9}) b/i
            // NextBook Tablets
          ],
          [n, [u, "NextBook"], [a, _]],
          [
            /\b(xtreme\_)?(v(1[045]|2[015]|[3469]0|7[05])) b/i
            // Voice Xtreme Phones
          ],
          [[u, "Voice"], n, [a, m]],
          [
            /\b(lvtel\-)?(v1[12]) b/i
            // LvTel Phones
          ],
          [[u, "LvTel"], n, [a, m]],
          [
            /\b(ph-1) /i
            // Essential PH-1
          ],
          [n, [u, "Essential"], [a, m]],
          [
            /\b(v(100md|700na|7011|917g).*\b) b/i
            // Envizen Tablets
          ],
          [n, [u, "Envizen"], [a, _]],
          [
            /\b(trio[-\w\. ]+) b/i
            // MachSpeed Tablets
          ],
          [n, [u, "MachSpeed"], [a, _]],
          [
            /\btu_(1491) b/i
            // Rotor Tablets
          ],
          [n, [u, "Rotor"], [a, _]],
          [
            /((?:tegranote|shield t(?!.+d tv))[\w- ]*?)(?: b|\))/i
            // Nvidia Tablets
          ],
          [n, [u, Ke], [a, _]],
          [
            /(sprint) (\w+)/i
            // Sprint Phones
          ],
          [u, n, [a, m]],
          [
            /(kin\.[onetw]{3})/i
            // Microsoft Kin
          ],
          [[n, /\./g, " "], [u, Ve], [a, m]],
          [
            /droid.+; (cc6666?|et5[16]|mc[239][23]x?|vc8[03]x?)\)/i
            // Zebra
          ],
          [n, [u, Se], [a, _]],
          [
            /droid.+; (ec30|ps20|tc[2-8]\d[kx])\)/i
          ],
          [n, [u, Se], [a, m]],
          [
            ///////////////////
            // SMARTTVS
            ///////////////////
            /smart-tv.+(samsung)/i
            // Samsung
          ],
          [u, [a, M]],
          [
            /hbbtv.+maple;(\d+)/i
          ],
          [[n, /^/, "SmartTV"], [u, pe], [a, M]],
          [
            /(nux; netcast.+smarttv|lg (netcast\.tv-201\d|android tv))/i
            // LG SmartTV
          ],
          [[u, Le], [a, M]],
          [
            /(apple) ?tv/i
            // Apple TV
          ],
          [u, [n, he + " TV"], [a, M]],
          [
            /crkey/i
            // Google Chromecast
          ],
          [[n, $e + "cast"], [u, Oe], [a, M]],
          [
            /droid.+aft(\w+)( bui|\))/i
            // Fire TV
          ],
          [n, [u, Ce], [a, M]],
          [
            /(shield \w+ tv)/i
            // Nvidia Shield TV
          ],
          [n, [u, Ke], [a, M]],
          [
            /\(dtv[\);].+(aquos)/i,
            /(aquos-tv[\w ]+)\)/i
            // Sharp
          ],
          [n, [u, ke], [a, M]],
          [
            /(bravia[\w ]+)( bui|\))/i
            // Sony
          ],
          [n, [u, X], [a, M]],
          [
            /(mi(tv|box)-?\w+) bui/i
            // Xiaomi
          ],
          [n, [u, Fe], [a, M]],
          [
            /Hbbtv.*(technisat) (.*);/i
            // TechniSAT
          ],
          [u, n, [a, M]],
          [
            /\b(roku)[\dx]*[\)\/]((?:dvp-)?[\d\.]*)/i,
            // Roku
            /hbbtv\/\d+\.\d+\.\d+ +\([\w\+ ]*; *([\w\d][^;]*);([^;]*)/i
            // HbbTV devices
          ],
          [[u, Ot], [n, Ot], [a, M]],
          [
            // SmartTV from Unidentified Vendors
            /droid.+; ([\w- ]+) (?:android tv|smart[- ]?tv)/i
          ],
          [n, [a, M]],
          [
            /\b(android tv|smart[- ]?tv|opera tv|tv; rv:)\b/i
          ],
          [[a, M]],
          [
            ///////////////////
            // CONSOLES
            ///////////////////
            /(ouya)/i,
            // Ouya
            /(nintendo) ([wids3utch]+)/i
            // Nintendo
          ],
          [u, n, [a, O]],
          [
            /droid.+; (shield)( bui|\))/i
            // Nvidia Portable
          ],
          [n, [u, Ke], [a, O]],
          [
            /(playstation \w+)/i
            // Playstation
          ],
          [n, [u, X], [a, O]],
          [
            /\b(xbox(?: one)?(?!; xbox))[\); ]/i
            // Microsoft Xbox
          ],
          [n, [u, Ve], [a, O]],
          [
            ///////////////////
            // WEARABLES
            ///////////////////
            /\b(sm-[lr]\d\d[0156][fnuw]?s?|gear live)\b/i
            // Samsung Galaxy Watch
          ],
          [n, [u, pe], [a, P]],
          [
            /((pebble))app/i,
            // Pebble
            /(asus|google|lg|oppo) ((pixel |zen)?watch[\w ]*)( bui|\))/i
            // Asus ZenWatch / LG Watch / Pixel Watch
          ],
          [u, n, [a, P]],
          [
            /(ow(?:19|20)?we?[1-3]{1,3})/i
            // Oppo Watch
          ],
          [n, [u, Me], [a, P]],
          [
            /(watch)(?: ?os[,\/]|\d,\d\/)[\d\.]+/i
            // Apple Watch
          ],
          [n, [u, he], [a, P]],
          [
            /(opwwe\d{3})/i
            // OnePlus Watch
          ],
          [n, [u, rt], [a, P]],
          [
            /(moto 360)/i
            // Motorola 360
          ],
          [n, [u, Ee], [a, P]],
          [
            /(smartwatch 3)/i
            // Sony SmartWatch
          ],
          [n, [u, X], [a, P]],
          [
            /(g watch r)/i
            // LG G Watch R
          ],
          [n, [u, Le], [a, P]],
          [
            /droid.+; (wt63?0{2,3})\)/i
          ],
          [n, [u, Se], [a, P]],
          [
            ///////////////////
            // XR
            ///////////////////
            /droid.+; (glass) \d/i
            // Google Glass
          ],
          [n, [u, Oe], [a, P]],
          [
            /(pico) (4|neo3(?: link|pro)?)/i
            // Pico
          ],
          [u, n, [a, P]],
          [
            /; (quest( \d| pro)?)/i
            // Oculus Quest
          ],
          [n, [u, j], [a, P]],
          [
            ///////////////////
            // EMBEDDED
            ///////////////////
            /(tesla)(?: qtcarbrowser|\/[-\w\.]+)/i
            // Tesla
          ],
          [u, [a, te]],
          [
            /(aeobc)\b/i
            // Echo Dot
          ],
          [n, [u, Ce], [a, te]],
          [
            /(homepod).+mac os/i
            // Apple HomePod
          ],
          [n, [u, he], [a, te]],
          [
            /windows iot/i
          ],
          [[a, te]],
          [
            ////////////////////
            // MIXED (GENERIC)
            ///////////////////
            /droid .+?; ([^;]+?)(?: bui|; wv\)|\) applew).+? mobile safari/i
            // Android Phones from Unidentified Vendors
          ],
          [n, [a, m]],
          [
            /droid .+?; ([^;]+?)(?: bui|\) applew).+?(?! mobile) safari/i
            // Android Tablets from Unidentified Vendors
          ],
          [n, [a, _]],
          [
            /\b((tablet|tab)[;\/]|focus\/\d(?!.+mobile))/i
            // Unidentifiable Tablet
          ],
          [[a, _]],
          [
            /(phone|mobile(?:[;\/]| [ \w\/\.]*safari)|pda(?=.+windows ce))/i
            // Unidentifiable Mobile
          ],
          [[a, m]],
          [
            /droid .+?; ([\w\. -]+)( bui|\))/i
            // Generic Android Device
          ],
          [n, [u, "Generic"]]
        ],
        engine: [
          [
            /windows.+ edge\/([\w\.]+)/i
            // EdgeHTML
          ],
          [f, [l, $t + "HTML"]],
          [
            /(arkweb)\/([\w\.]+)/i
            // ArkWeb
          ],
          [l, f],
          [
            /webkit\/537\.36.+chrome\/(?!27)([\w\.]+)/i
            // Blink
          ],
          [f, [l, "Blink"]],
          [
            /(presto)\/([\w\.]+)/i,
            // Presto
            /(webkit|trident|netfront|netsurf|amaya|lynx|w3m|goanna|servo)\/([\w\.]+)/i,
            // WebKit/Trident/NetFront/NetSurf/Amaya/Lynx/w3m/Goanna/Servo
            /ekioh(flow)\/([\w\.]+)/i,
            // Flow
            /(khtml|tasman|links)[\/ ]\(?([\w\.]+)/i,
            // KHTML/Tasman/Links
            /(icab)[\/ ]([23]\.[\d\.]+)/i,
            // iCab
            /\b(libweb)/i
            // LibWeb
          ],
          [l, f],
          [
            /ladybird\//i
          ],
          [[l, "LibWeb"]],
          [
            /rv\:([\w\.]{1,9})\b.+(gecko)/i
            // Gecko
          ],
          [f, l]
        ],
        os: [
          [
            // Windows
            /microsoft (windows) (vista|xp)/i
            // Windows (iTunes)
          ],
          [l, f],
          [
            /(windows (?:phone(?: os)?|mobile|iot))[\/ ]?([\d\.\w ]*)/i
            // Windows Phone
          ],
          [l, [f, He, Qt]],
          [
            /windows nt 6\.2; (arm)/i,
            // Windows RT
            /windows[\/ ]([ntce\d\. ]+\w)(?!.+xbox)/i,
            /(?:win(?=3|9|n)|win 9x )([nt\d\.]+)/i
          ],
          [[f, He, Qt], [l, "Windows"]],
          [
            // iOS/macOS
            /[adehimnop]{4,7}\b(?:.*os ([\w]+) like mac|; opera)/i,
            // iOS
            /(?:ios;fbsv\/|iphone.+ios[\/ ])([\d\.]+)/i,
            /cfnetwork\/.+darwin/i
          ],
          [[f, /_/g, "."], [l, "iOS"]],
          [
            /(mac os x) ?([\w\. ]*)/i,
            /(macintosh|mac_powerpc\b)(?!.+haiku)/i
            // Mac OS
          ],
          [[l, S], [f, /_/g, "."]],
          [
            // Mobile OSes
            /droid ([\w\.]+)\b.+(android[- ]x86|harmonyos)/i
            // Android-x86/HarmonyOS
          ],
          [f, l],
          [
            /(ubuntu) ([\w\.]+) like android/i
            // Ubuntu Touch
          ],
          [[l, /(.+)/, "$1 Touch"], f],
          [
            // Android/Blackberry/WebOS/QNX/Bada/RIM/KaiOS/Maemo/MeeGo/S40/Sailfish OS/OpenHarmony/Tizen
            /(android|bada|blackberry|kaios|maemo|meego|openharmony|qnx|rim tablet os|sailfish|series40|symbian|tizen|webos)\w*[-\/; ]?([\d\.]*)/i
          ],
          [l, f],
          [
            /\(bb(10);/i
            // BlackBerry 10
          ],
          [f, [l, tt]],
          [
            /(?:symbian ?os|symbos|s60(?=;)|series ?60)[-\/ ]?([\w\.]*)/i
            // Symbian
          ],
          [f, [l, "Symbian"]],
          [
            /mozilla\/[\d\.]+ \((?:mobile|tablet|tv|mobile; [\w ]+); rv:.+ gecko\/([\w\.]+)/i
            // Firefox OS
          ],
          [f, [l, Ae + " OS"]],
          [
            /web0s;.+rt(tv)/i,
            /\b(?:hp)?wos(?:browser)?\/([\w\.]+)/i
            // WebOS
          ],
          [f, [l, "webOS"]],
          [
            /watch(?: ?os[,\/]|\d,\d\/)([\d\.]+)/i
            // watchOS
          ],
          [f, [l, "watchOS"]],
          [
            // Google Chromecast
            /crkey\/([\d\.]+)/i
            // Google Chromecast
          ],
          [f, [l, $e + "cast"]],
          [
            /(cros) [\w]+(?:\)| ([\w\.]+)\b)/i
            // Chromium OS
          ],
          [[l, v], f],
          [
            // Smart TVs
            /panasonic;(viera)/i,
            // Panasonic Viera
            /(netrange)mmh/i,
            // Netrange
            /(nettv)\/(\d+\.[\w\.]+)/i,
            // NetTV
            // Console
            /(nintendo|playstation) ([wids345portablevuch]+)/i,
            // Nintendo/Playstation
            /(xbox); +xbox ([^\);]+)/i,
            // Microsoft Xbox (360, One, X, S, Series X, Series S)
            // Other
            /\b(joli|palm)\b ?(?:os)?\/?([\w\.]*)/i,
            // Joli/Palm
            /(mint)[\/\(\) ]?(\w*)/i,
            // Mint
            /(mageia|vectorlinux)[; ]/i,
            // Mageia/VectorLinux
            /([kxln]?ubuntu|debian|suse|opensuse|gentoo|arch(?= linux)|slackware|fedora|mandriva|centos|pclinuxos|red ?hat|zenwalk|linpus|raspbian|plan 9|minix|risc os|contiki|deepin|manjaro|elementary os|sabayon|linspire)(?: gnu\/linux)?(?: enterprise)?(?:[- ]linux)?(?:-gnu)?[-\/ ]?(?!chrom|package)([-\w\.]*)/i,
            // Ubuntu/Debian/SUSE/Gentoo/Arch/Slackware/Fedora/Mandriva/CentOS/PCLinuxOS/RedHat/Zenwalk/Linpus/Raspbian/Plan9/Minix/RISCOS/Contiki/Deepin/Manjaro/elementary/Sabayon/Linspire
            /(hurd|linux)(?: arm\w*| x86\w*| ?)([\w\.]*)/i,
            // Hurd/Linux
            /(gnu) ?([\w\.]*)/i,
            // GNU
            /\b([-frentopcghs]{0,5}bsd|dragonfly)[\/ ]?(?!amd|[ix346]{1,2}86)([\w\.]*)/i,
            // FreeBSD/NetBSD/OpenBSD/PC-BSD/GhostBSD/DragonFly
            /(haiku) (\w+)/i
            // Haiku
          ],
          [l, f],
          [
            /(sunos) ?([\w\.\d]*)/i
            // Solaris
          ],
          [[l, "Solaris"], f],
          [
            /((?:open)?solaris)[-\/ ]?([\w\.]*)/i,
            // Solaris
            /(aix) ((\d)(?=\.|\)| )[\w\.])*/i,
            // AIX
            /\b(beos|os\/2|amigaos|morphos|openvms|fuchsia|hp-ux|serenityos)/i,
            // BeOS/OS2/AmigaOS/MorphOS/OpenVMS/Fuchsia/HP-UX/SerenityOS
            /(unix) ?([\w\.]*)/i
            // UNIX
          ],
          [l, f]
        ]
      }, Z = function(y, C) {
        if (typeof y === p && (C = y, y = r), !(this instanceof Z))
          return new Z(y, C).getResult();
        var x = typeof i !== c && i.navigator ? i.navigator : r, D = y || (x && x.userAgent ? x.userAgent : o), ue = x && x.userAgentData ? x.userAgentData : r, re = C ? R(ei, C) : ei, E = x && x.userAgent == D;
        return this.getBrowser = function() {
          var g = {};
          return g[l] = r, g[f] = r, qe.call(g, D, re.browser), g[w] = st(g[f]), E && x && x.brave && typeof x.brave.isBrave == b && (g[l] = "Brave"), g;
        }, this.getCPU = function() {
          var g = {};
          return g[$] = r, qe.call(g, D, re.cpu), g;
        }, this.getDevice = function() {
          var g = {};
          return g[u] = r, g[n] = r, g[a] = r, qe.call(g, D, re.device), E && !g[a] && ue && ue.mobile && (g[a] = m), E && g[n] == "Macintosh" && x && typeof x.standalone !== c && x.maxTouchPoints && x.maxTouchPoints > 2 && (g[n] = "iPad", g[a] = _), g;
        }, this.getEngine = function() {
          var g = {};
          return g[l] = r, g[f] = r, qe.call(g, D, re.engine), g;
        }, this.getOS = function() {
          var g = {};
          return g[l] = r, g[f] = r, qe.call(g, D, re.os), E && !g[l] && ue && ue.platform && ue.platform != "Unknown" && (g[l] = ue.platform.replace(/chrome os/i, v).replace(/macos/i, S)), g;
        }, this.getResult = function() {
          return {
            ua: this.getUA(),
            browser: this.getBrowser(),
            engine: this.getEngine(),
            os: this.getOS(),
            device: this.getDevice(),
            cpu: this.getCPU()
          };
        }, this.getUA = function() {
          return D;
        }, this.setUA = function(g) {
          return D = typeof g === h && g.length > le ? Ot(g, le) : g, this;
        }, this.setUA(D), this;
      };
      Z.VERSION = s, Z.BROWSER = L([l, f, w]), Z.CPU = L([$]), Z.DEVICE = L([n, u, a, O, m, M, _, P, te]), Z.ENGINE = Z.OS = L([l, f]), t.exports && (e = t.exports = Z), e.UAParser = Z;
      var Pe = typeof i !== c && (i.jQuery || i.Zepto);
      if (Pe && !Pe.ua) {
        var nt = new Z();
        Pe.ua = nt.getResult(), Pe.ua.get = function() {
          return nt.getUA();
        }, Pe.ua.set = function(y) {
          nt.setUA(y);
          var C = nt.getResult();
          for (var x in C)
            Pe.ua[x] = C[x];
        };
      }
    })(typeof window == "object" ? window : _s);
  })(Ye, Ye.exports)), Ye.exports;
}
var ys = xs();
const Cs = /* @__PURE__ */ gs(ys), Es = new Cs(), Qi = Es.getResult(), ks = (_a = Qi.engine.name) == null ? void 0 : _a.toLowerCase(), hi = Number((_b = Qi.engine.version) == null ? void 0 : _b.split(".")[0]), Ut = {
  "0x0001": "Escape",
  "0x0002": "Digit1",
  "0x0003": "Digit2",
  "0x0004": "Digit3",
  "0x0005": "Digit4",
  "0x0006": "Digit5",
  "0x0007": "Digit6",
  "0x0008": "Digit7",
  "0x0009": "Digit8",
  "0x000A": "Digit9",
  "0x000B": "Digit0",
  "0x000C": "Minus",
  "0x000D": "Equal",
  "0x000E": "Backspace",
  "0x000F": "Tab",
  "0x0010": "KeyQ",
  "0x0011": "KeyW",
  "0x0012": "KeyE",
  "0x0013": "KeyR",
  "0x0014": "KeyT",
  "0x0015": "KeyY",
  "0x0016": "KeyU",
  "0x0017": "KeyI",
  "0x0018": "KeyO",
  "0x0019": "KeyP",
  "0x001A": "BracketLeft",
  "0x001B": "BracketRight",
  "0x001C": "Enter",
  "0x001D": "ControlLeft",
  "0x001E": "KeyA",
  "0x001F": "KeyS",
  "0x0020": "KeyD",
  "0x0021": "KeyF",
  "0x0022": "KeyG",
  "0x0023": "KeyH",
  "0x0024": "KeyJ",
  "0x0025": "KeyK",
  "0x0026": "KeyL",
  "0x0027": "Semicolon",
  "0x0028": "Quote",
  "0x0029": "Backquote",
  "0x002A": "ShiftLeft",
  "0x002B": "Backslash",
  "0x002C": "KeyZ",
  "0x002D": "KeyX",
  "0x002E": "KeyC",
  "0x002F": "KeyV",
  "0x0030": "KeyB",
  "0x0031": "KeyN",
  "0x0032": "KeyM",
  "0x0033": "Comma",
  "0x0034": "Period",
  "0x0035": "Slash",
  "0x0036": "ShiftRight",
  "0x0037": "NumpadMultiply",
  "0x0038": "AltLeft",
  "0x0039": "Space",
  "0x003A": "CapsLock",
  "0x003B": "F1",
  "0x003C": "F2",
  "0x003D": "F3",
  "0x003E": "F4",
  "0x003F": "F5",
  "0x0040": "F6",
  "0x0041": "F7",
  "0x0042": "F8",
  "0x0043": "F9",
  "0x0044": "F10",
  "0x0045": "Pause",
  "0x0046": "ScrollLock",
  "0x0047": "Numpad7",
  "0x0048": "Numpad8",
  "0x0049": "Numpad9",
  "0x004A": "NumpadSubtract",
  "0x004B": "Numpad4",
  "0x004C": "Numpad5",
  "0x004D": "Numpad6",
  "0x004E": "NumpadAdd",
  "0x004F": "Numpad1",
  "0x0050": "Numpad2",
  "0x0051": "Numpad3",
  "0x0052": "Numpad0",
  "0x0053": "NumpadDecimal",
  "0x0056": "IntlBackslash",
  "0x0057": "F11",
  "0x0058": "F12",
  "0x0059": "NumpadEqual",
  "0x0064": "F13",
  "0x0065": "F14",
  "0x0066": "F15",
  "0x0067": "F16",
  "0x0068": "F17",
  "0x0069": "F18",
  "0x006A": "F19",
  "0x006B": "F20",
  "0x006C": "F21",
  "0x006D": "F22",
  "0x006E": "F23",
  "0x0070": "KanaMode",
  "0x0071": "Lang2",
  "0x0072": "Lang1",
  "0x0073": "IntlRo",
  "0x0076": "F24",
  "0x0079": "Convert",
  "0x007B": "NonConvert",
  "0x007D": "IntlYen",
  "0x007E": "NumpadComma",
  "0xE010": "MediaTrackPrevious",
  "0xE019": "MediaTrackNext",
  "0xE01C": "NumpadEnter",
  "0xE01D": "ControlRight",
  "0xE021": "LaunchApp2",
  "0xE022": "MediaPlayPause",
  "0xE024": "MediaStop",
  "0xE032": "BrowserHome",
  "0xE035": "NumpadDivide",
  "0xE037": "PrintScreen",
  "0xE038": "AltRight",
  "0xE045": "NumLock",
  "0xE046": "Pause",
  "0xE047": "Home",
  "0xE048": "ArrowUp",
  "0xE049": "PageUp",
  "0xE04B": "ArrowLeft",
  "0xE04D": "ArrowRight",
  "0xE04F": "End",
  "0xE050": "ArrowDown",
  "0xE051": "PageDown",
  "0xE052": "Insert",
  "0xE053": "Delete",
  "0xE05D": "ContextMenu",
  "0xE05E": "Power",
  "0xE065": "BrowserSearch",
  "0xE066": "BrowserFavorites",
  "0xE067": "BrowserRefresh",
  "0xE068": "BrowserStop",
  "0xE069": "BrowserForward",
  "0xE06A": "BrowserBack",
  "0xE06B": "LaunchApp1",
  "0xE06C": "LaunchMail",
  "0xE06D": "MediaSelect"
}, bi = {
  "0x0077": "Lang4",
  "0x0078": "Lang3",
  "0xE008": "Undo",
  "0xE00A": "Paste",
  "0xE017": "Cut",
  "0xE018": "Copy",
  "0xE020": "AudioVolumeMute",
  "0xE02C": "Eject",
  "0xE02E": "AudioVolumeDown",
  "0xE030": "AudioVolumeUp",
  "0xE03B": "Help",
  "0xE05B": "MetaLeft",
  "0xE05C": "MetaRight",
  "0xE05F": "Sleep",
  "0xE063": "WakeUp"
}, Ss = {
  "0x0054": "PrintScreen",
  "0xE020": "VolumeMute",
  // The documentation says it's 'AudioVolumeMute', but the actual test shows that it's 'VolumeMute'.
  "0xE02E": "VolumeDown",
  "0xE030": "VolumeUp",
  "0xE05B": hi > 117 ? "MetaLeft" : "OSLeft",
  "0xE05C": hi > 117 ? "MetaRight" : "OSRight"
}, Ds = {
  blink: Bt({ ...Ut, ...bi }),
  gecko: Bt({ ...Ut, ...Ss }),
  webkit: Bt({ ...Ut, ...bi })
};
function Bt(t) {
  const e = {};
  for (const [i, r] of Object.entries(t))
    e[r] = i;
  return e;
}
const pi = function(t) {
  const e = Ds[ks];
  return parseInt(e[t], 16);
};
var qt = /* @__PURE__ */ ((t) => (t.CTRL_LEFT = "ControlLeft", t.SHIFT_LEFT = "ShiftLeft", t.SHIFT_RIGHT = "ShiftRight", t.ALT_LEFT = "AltLeft", t.CTRL_RIGHT = "ControlRight", t.ALT_RIGHT = "AltRight", t.ControlLeft = "ControlLeft", t.ShiftLeft = "ShiftLeft", t.ShiftRight = "ShiftRight", t.AltLeft = "AltLeft", t.ControlRight = "ControlRight", t.AltRight = "AltRight", t))(qt || {}), Ue = /* @__PURE__ */ ((t) => (t.CAPS_LOCK = "CapsLock", t.NUM_LOCK = "NumLock", t.SCROLL_LOCK = "ScrollLock", t.KANA_MODE = "KanaMode", t.CapsLock = "CapsLock", t.ScrollLock = "ScrollLock", t.NumLock = "NumLock", t.KanaMode = "KanaMode", t))(Ue || {}), ce = /* @__PURE__ */ ((t) => (t[t.CTRL_ALT_DEL = 0] = "CTRL_ALT_DEL", t[t.META = 1] = "META", t[t.CTRL_C = 2] = "CTRL_C", t[t.CTRL_V = 3] = "CTRL_V", t))(ce || {}), ve = /* @__PURE__ */ ((t) => (t[t.Fit = 1] = "Fit", t[t.Full = 2] = "Full", t[t.Real = 3] = "Real", t))(ve || {}), Xe = /* @__PURE__ */ ((t) => (t[t.Pixel = 0] = "Pixel", t[t.Line = 1] = "Line", t[t.Page = 2] = "Page", t))(Xe || {});
class Ts {
  constructor(e, i, r) {
    __publicField(this, "username");
    __publicField(this, "password");
    __publicField(this, "destination");
    __publicField(this, "proxyAddress");
    __publicField(this, "webSocketProtocols");
    __publicField(this, "serverDomain");
    __publicField(this, "authToken");
    __publicField(this, "desktopSize");
    __publicField(this, "extensions");
    this.username = e.username, this.password = e.password, this.proxyAddress = i.address, this.authToken = i.authToken, this.destination = r.destination, this.serverDomain = r.serverDomain, this.webSocketProtocols = r.webSocketProtocols ?? [], this.extensions = r.extensions, this.desktopSize = r.desktopSize;
  }
}
class Rs {
  /**
   * Creates a new ConfigBuilder instance.
   */
  constructor() {
    __publicField(this, "username", "");
    __publicField(this, "password", "");
    __publicField(this, "destination", "");
    __publicField(this, "proxyAddress", "");
    __publicField(this, "webSocketProtocols", []);
    __publicField(this, "serverDomain", "");
    __publicField(this, "authToken", "");
    __publicField(this, "desktopSize");
    __publicField(this, "extensions", []);
  }
  /**
   * Optional parameter
   *
   * @param username - The username to use for authentication
   * @returns The builder instance for method chaining
   */
  withUsername(e) {
    return this.username = e, this;
  }
  /**
   * Optional parameter
   *
   * @param password - The password for authentication
   * @returns The builder instance for method chaining
   */
  withPassword(e) {
    return this.password = e, this;
  }
  /**
   * Required parameter
   *
   * @param destination - The destination address to connect to
   * @returns The builder instance for method chaining
   */
  withDestination(e) {
    return this.destination = e, this;
  }
  /**
   * Required parameter
   *
   * @param proxyAddress - The address of the proxy server
   * @returns The builder instance for method chaining
   */
  withProxyAddress(e) {
    return this.proxyAddress = e, this;
  }
  /**
   * Optional parameter
   *
   * @param protocols - The WebSocket subprotocols offered during the opening handshake
   * @returns The builder instance for method chaining
   */
  withWebSocketProtocols(e) {
    return this.webSocketProtocols = [...e], this;
  }
  /**
   * Optional parameter
   *
   * @param serverDomain - The server domain to connect to
   * @returns The builder instance for method chaining
   */
  withServerDomain(e) {
    return this.serverDomain = e, this;
  }
  /**
   * Required parameter
   *
   * @param authToken - JWT token to connect to the proxy
   * @returns The builder instance for method chaining
   */
  withAuthToken(e) {
    return this.authToken = e, this;
  }
  /**
   * Optional parameter
   *
   * @param ext - The extension
   * @returns The builder instance for method chaining
   */
  withExtension(e) {
    return this.extensions.push(e), this;
  }
  /**
   * Optional
   *
   * @param desktopSize - The desktop size configuration object
   * @returns The builder instance for method chaining
   */
  withDesktopSize(e) {
    return this.desktopSize = e, this;
  }
  /**
   * Builds a new Config instance.
   *
   * @throws {Error} If required parameters (destination, proxyAddress, authToken) are not set
   * @returns A new Config instance with the configured values
   */
  build() {
    if (this.destination === "")
      throw new Error("destination has to be specified");
    if (this.proxyAddress === "")
      throw new Error("proxy address has to be specified");
    if (this.authToken === "")
      throw new Error("authentication token has to be specified");
    const e = { username: this.username, password: this.password }, i = { address: this.proxyAddress, authToken: this.authToken }, r = {
      destination: this.destination,
      serverDomain: this.serverDomain,
      webSocketProtocols: this.webSocketProtocols,
      extensions: this.extensions,
      desktopSize: this.desktopSize
    };
    return new Ts(e, i, r);
  }
}
class De {
  constructor() {
    __publicField(this, "subscribers");
    this.subscribers = [];
  }
  subscribe(e) {
    this.subscribers.push(e);
  }
  publish(e) {
    for (const i of this.subscribers)
      i(e);
  }
}
class $s {
  constructor(e) {
    __publicField(this, "module");
    __publicField(this, "canvas");
    __publicField(this, "keyboardUnicodeMode", false);
    __publicField(this, "backendSupportsUnicodeKeyboardShortcuts");
    __publicField(this, "onRemoteClipboardChanged");
    __publicField(this, "onForceClipboardUpdate");
    __publicField(this, "onCanvasResized");
    __publicField(this, "onWarningCallback");
    __publicField(this, "onClipboardRemoteUpdate");
    __publicField(this, "fileTransferProvider");
    __publicField(this, "cursorHasOverride", false);
    __publicField(this, "lastCursorStyle", "default");
    __publicField(this, "enableClipboard", true);
    __publicField(this, "_autoClipboard", true);
    __publicField(this, "sessionStartedObservable", new De());
    /// Published when the session ends: shut down, or its run() returned.
    __publicField(this, "sessionEndedObservable", new De());
    __publicField(this, "resizeObservable", new De());
    __publicField(this, "session");
    __publicField(this, "modifierKeyPressed", []);
    __publicField(this, "mousePositionObservable", new De());
    __publicField(this, "changeVisibilityObservable", new De());
    __publicField(this, "scaleObservable", new De());
    __publicField(this, "dynamicResizeObservable", new De());
    this.module = e, F.info("Web bridge initialized.");
  }
  get autoClipboard() {
    return this._autoClipboard;
  }
  // If set to false, the clipboard will not be enabled and the callbacks will not be registered to the Rust side
  setEnableClipboard(e) {
    this.enableClipboard = e;
  }
  // If set to true, automatic clipboard synchronization with the server is enabled.
  //
  // If set to false, then the client must invoke `PublicAPI.saveRemoteClipboardData` and
  // `PublicAPI.sendClipboardData` to write to clipboard and to send clipboard data to the server.
  setEnableAutoClipboard(e) {
    this._autoClipboard = e;
  }
  /// Callback to set the local clipboard content to data received from the remote.
  setOnRemoteClipboardChanged(e) {
    this.onRemoteClipboardChanged = e;
  }
  /// Callback which is called when the remote requests a forced clipboard update (e.g. on
  /// clipboard initialization sequence)
  setOnForceClipboardUpdate(e) {
    this.onForceClipboardUpdate = e;
  }
  /// Callback which is called when the canvas is resized.
  setOnCanvasResized(e) {
    this.onCanvasResized = e;
  }
  /// Callback which is called when the warning event is emitted.
  setOnWarningCallback(e) {
    this.onWarningCallback = e;
  }
  /// Callback which is called when the clipboard remote update event is emitted.
  setOnClipboardRemoteUpdate(e) {
    this.onClipboardRemoteUpdate = e;
  }
  /**
   * Enable file transfer support. Must be called before connect().
   * Implicitly enables clipboard (required for file transfer protocol).
   *
   * @param provider - Protocol-specific file transfer provider (e.g., RdpFileTransferProvider)
   * @returns The same provider, for chaining
   */
  enableFileTransfer(e) {
    var _a2;
    return (_a2 = this.fileTransferProvider) == null ? void 0 : _a2.dispose(), this.fileTransferProvider = e, this.enableClipboard = true, e;
  }
  mouseIn(e) {
    if (!this.session) return;
    this.syncModifier(e);
    const r = [
      [1, 0],
      // left button
      [2, 2],
      // right button
      [4, 1]
      // middle button
    ].filter(([s]) => (e.buttons & s) === 0).map(([, s]) => this.module.DeviceEvent.mouseButtonReleased(s));
    r.length > 0 && this.doTransactionFromDeviceEvents(r);
  }
  mouseOut(e) {
    this.releaseAllInputs();
  }
  focusLost() {
    this.releaseAllInputs();
  }
  sendKeyboardEvent(e) {
    this.sendKeyboard(e);
  }
  shutdown() {
    var _a2;
    const e = this.session;
    this.session = void 0, this.sessionEndedObservable.publish(null), (_a2 = this.fileTransferProvider) == null ? void 0 : _a2.dispose(), e == null ? void 0 : e.shutdown();
  }
  mouseButtonState(e, i, r) {
    r && e.preventDefault();
    const s = i ? this.module.DeviceEvent.mouseButtonPressed : this.module.DeviceEvent.mouseButtonReleased;
    this.doTransactionFromDeviceEvents([s(e.button)]);
  }
  updateMousePosition(e) {
    this.doTransactionFromDeviceEvents([this.module.DeviceEvent.mouseMove(e.x, e.y)]), this.mousePositionObservable.publish(e);
  }
  configBuilder() {
    return new Rs();
  }
  async connect(e) {
    var _a2;
    const i = new this.module.SessionBuilder();
    if (i.proxyAddress(e.proxyAddress), i.webSocketProtocols(e.webSocketProtocols ?? []), i.destination(e.destination), i.serverDomain(e.serverDomain), i.password(e.password), i.authToken(e.authToken), i.username(e.username), i.renderCanvas(this.canvas), i.setCursorStyleCallbackContext(this), i.setCursorStyleCallback(this.setCursorStyleCallback), e.extensions.forEach((o) => {
      i.extension(o);
    }), this.onRemoteClipboardChanged != null && this.enableClipboard && i.remoteClipboardChangedCallback(this.onRemoteClipboardChanged), this.onForceClipboardUpdate != null && this.enableClipboard && i.forceClipboardUpdateCallback(this.onForceClipboardUpdate), this.fileTransferProvider != null && this.enableClipboard)
      for (const o of this.fileTransferProvider.getBuilderExtensions())
        i.extension(o);
    this.onCanvasResized != null && i.canvasResizedCallback(this.onCanvasResized), e.desktopSize != null && i.desktopSize(
      new this.module.DesktopSize(e.desktopSize.width, e.desktopSize.height)
    );
    const r = await i.connect();
    this.session = r, (_a2 = this.fileTransferProvider) == null ? void 0 : _a2.setSession(r), this.resizeObservable.publish({
      desktopSize: r.desktopSize(),
      sessionId: 0
    }), this.sessionStartedObservable.publish(null);
    const s = async () => {
      try {
        return F.info("Starting the session."), await r.run();
      } finally {
        this.session === r && (this.session = void 0, this.sessionEndedObservable.publish(null)), this.setVisibility(false);
      }
    };
    return {
      sessionId: 0,
      initialDesktopSize: r.desktopSize(),
      websocketPort: 0,
      run: s
    };
  }
  sendSpecialCombination(e) {
    switch (e) {
      case ce.CTRL_ALT_DEL:
        this.ctrlAltDel();
        break;
      case ce.META:
        this.sendMeta();
        break;
      case ce.CTRL_C:
        this.sendCtrlC();
        break;
      case ce.CTRL_V:
        this.sendCtrlV();
        break;
    }
  }
  rotation_unit_from_wheel_event(e) {
    switch (e.deltaMode) {
      case e.DOM_DELTA_PIXEL:
        return Xe.Pixel;
      case e.DOM_DELTA_LINE:
        return Xe.Line;
      case e.DOM_DELTA_PAGE:
        return Xe.Page;
      default:
        return Xe.Pixel;
    }
  }
  mouseWheel(e) {
    const i = e.deltaY !== 0, r = i ? e.deltaY : e.deltaX, s = this.rotation_unit_from_wheel_event(e);
    this.doTransactionFromDeviceEvents([
      this.module.DeviceEvent.wheelRotations(i, -r, s)
    ]);
  }
  emitWarningEvent(e) {
    var _a2;
    (_a2 = this.onWarningCallback) == null ? void 0 : _a2.call(this, e);
  }
  emitClipboardRemoteUpdateEvent() {
    var _a2;
    (_a2 = this.onClipboardRemoteUpdate) == null ? void 0 : _a2.call(this);
  }
  setVisibility(e) {
    this.changeVisibilityObservable.publish(e);
  }
  setScale(e) {
    this.scaleObservable.publish(e);
  }
  setCanvas(e) {
    this.canvas = e;
  }
  resizeDynamic(e, i, r) {
    var _a2;
    this.dynamicResizeObservable.publish({ width: e, height: i }), (_a2 = this.session) == null ? void 0 : _a2.resize(e, i, r);
  }
  /// Triggered by the browser when local clipboard is updated. Clipboard backend should
  /// cache the content and send it to the server when it is requested.
  onClipboardChanged(e) {
    return (async () => {
      var _a2;
      await ((_a2 = this.session) == null ? void 0 : _a2.onClipboardPaste(e));
    })();
  }
  onClipboardChangedEmpty() {
    return (async () => {
      var _a2;
      await ((_a2 = this.session) == null ? void 0 : _a2.onClipboardPaste(new this.module.ClipboardData()));
    })();
  }
  setKeyboardUnicodeMode(e) {
    this.keyboardUnicodeMode = e;
  }
  setCursorStyleOverride(e) {
    e == null ? (this.canvas.style.cursor = this.lastCursorStyle, this.cursorHasOverride = false) : (this.canvas.style.cursor = e, this.cursorHasOverride = true);
  }
  invokeExtension(e) {
    var _a2;
    (_a2 = this.session) == null ? void 0 : _a2.invokeExtension(e);
  }
  releaseAllInputs() {
    var _a2;
    (_a2 = this.session) == null ? void 0 : _a2.releaseAllInputs();
  }
  supportsUnicodeKeyboardShortcuts() {
    var _a2, _b2;
    return this.backendSupportsUnicodeKeyboardShortcuts !== void 0 ? this.backendSupportsUnicodeKeyboardShortcuts : ((_a2 = this.session) == null ? void 0 : _a2.supportsUnicodeKeyboardShortcuts) ? (this.backendSupportsUnicodeKeyboardShortcuts = (_b2 = this.session) == null ? void 0 : _b2.supportsUnicodeKeyboardShortcuts(), this.backendSupportsUnicodeKeyboardShortcuts) : true;
  }
  sendKeyboard(e) {
    e.preventDefault();
    let i, r;
    e.type === "keydown" ? (i = this.module.DeviceEvent.keyPressed, r = this.module.DeviceEvent.unicodePressed) : e.type === "keyup" && (i = this.module.DeviceEvent.keyReleased, r = this.module.DeviceEvent.unicodeReleased);
    let s = true;
    if (!this.supportsUnicodeKeyboardShortcuts()) {
      for (const b of ["Alt", "Control", "Meta", "AltGraph", "OS"])
        if (e.getModifierState(b)) {
          s = false;
          break;
        }
    }
    const o = e.code in qt, d = e.code in Ue;
    if (o && this.updateModifierKeyState(e), d && this.syncModifier(e), !e.repeat || !o && !d) {
      const b = pi(e.code), c = Number.isNaN(b);
      if (!this.keyboardUnicodeMode && i && !c) {
        this.doTransactionFromDeviceEvents([i(b)]);
        return;
      }
      if (this.keyboardUnicodeMode && r && i) {
        if (["Dead", "Unidentified"].indexOf(e.key) != -1)
          return;
        const p = pi(e.key);
        Number.isNaN(p) && e.key.length === 1 && !o && s ? this.doTransactionFromDeviceEvents([r(e.key)]) : c || this.doTransactionFromDeviceEvents([i(b)]);
        return;
      }
    }
  }
  setCursorStyleCallback(e, i, r, s) {
    let o;
    switch (e) {
      case "hidden": {
        o = "none";
        break;
      }
      case "default": {
        o = "default";
        break;
      }
      case "url": {
        if (i == null || r == null || s == null) {
          console.error("Invalid custom cursor parameters.");
          return;
        }
        const d = new Image();
        d.src = i;
        const b = Math.round(r), c = Math.round(s);
        o = `url(${i}) ${b} ${c}, default`;
        break;
      }
      default: {
        console.error(`Unsupported cursor style: ${e}.`);
        return;
      }
    }
    this.lastCursorStyle = o, this.cursorHasOverride || (this.canvas.style.cursor = o);
  }
  syncModifier(e) {
    var _a2;
    const i = e.getModifierState(Ue.CAPS_LOCK), r = e.getModifierState(Ue.NUM_LOCK), s = e.getModifierState(Ue.SCROLL_LOCK), o = e.getModifierState(Ue.KANA_MODE);
    (_a2 = this.session) == null ? void 0 : _a2.synchronizeLockKeys(
      s,
      r,
      i,
      o
    );
  }
  updateModifierKeyState(e) {
    const i = qt[e.code];
    this.modifierKeyPressed.indexOf(i) === -1 ? this.modifierKeyPressed.push(i) : e.type === "keyup" && this.modifierKeyPressed.splice(this.modifierKeyPressed.indexOf(i), 1);
  }
  doTransactionFromDeviceEvents(e) {
    var _a2;
    const i = new this.module.InputTransaction();
    e.forEach((r) => i.addEvent(r)), (_a2 = this.session) == null ? void 0 : _a2.applyInputs(i);
  }
  ctrlAltDel() {
    const e = parseInt("0x001D", 16), i = parseInt("0x0038", 16), r = parseInt("0xE053", 16);
    this.doTransactionFromDeviceEvents([
      this.module.DeviceEvent.keyPressed(e),
      this.module.DeviceEvent.keyPressed(i),
      this.module.DeviceEvent.keyPressed(r),
      this.module.DeviceEvent.keyReleased(e),
      this.module.DeviceEvent.keyReleased(i),
      this.module.DeviceEvent.keyReleased(r)
    ]);
  }
  sendMeta() {
    const e = parseInt("0xE05B", 16);
    this.doTransactionFromDeviceEvents([
      this.module.DeviceEvent.keyPressed(e),
      this.module.DeviceEvent.keyReleased(e)
    ]);
  }
  sendCtrlC() {
    const e = parseInt("0x001D", 16), i = parseInt("0x002E", 16);
    this.doTransactionFromDeviceEvents([
      this.module.DeviceEvent.keyPressed(e),
      this.module.DeviceEvent.keyPressed(i),
      this.module.DeviceEvent.keyReleased(i),
      this.module.DeviceEvent.keyReleased(e)
    ]);
  }
  sendCtrlV() {
    const e = parseInt("0x001D", 16), i = parseInt("0x002F", 16);
    this.doTransactionFromDeviceEvents([
      this.module.DeviceEvent.keyPressed(e),
      this.module.DeviceEvent.keyPressed(i),
      this.module.DeviceEvent.keyReleased(i),
      this.module.DeviceEvent.keyReleased(e)
    ]);
  }
}
class As {
  constructor(e, i) {
    __publicField(this, "remoteDesktopService");
    __publicField(this, "clipboardService");
    this.remoteDesktopService = e, this.clipboardService = i;
  }
  configBuilder() {
    return this.remoteDesktopService.configBuilder();
  }
  connect(e) {
    return F.info("Initializing connection."), this.remoteDesktopService.connect(e);
  }
  ctrlAltDel() {
    this.remoteDesktopService.sendSpecialCombination(ce.CTRL_ALT_DEL);
  }
  metaKey() {
    this.remoteDesktopService.sendSpecialCombination(ce.META);
  }
  ctrlC() {
    this.remoteDesktopService.sendSpecialCombination(ce.CTRL_C);
  }
  ctrlV() {
    this.remoteDesktopService.sendSpecialCombination(ce.CTRL_V);
  }
  setVisibility(e) {
    F.info(`Change component visibility to: ${e}`), this.remoteDesktopService.setVisibility(e);
  }
  setScale(e) {
    this.remoteDesktopService.setScale(e);
  }
  shutdown() {
    this.remoteDesktopService.shutdown();
  }
  setKeyboardUnicodeMode(e) {
    this.remoteDesktopService.setKeyboardUnicodeMode(e);
  }
  setCursorStyleOverride(e) {
    this.remoteDesktopService.setCursorStyleOverride(e);
  }
  resize(e, i, r) {
    this.remoteDesktopService.resizeDynamic(e, i, r);
  }
  setEnableClipboard(e) {
    this.remoteDesktopService.setEnableClipboard(e);
  }
  setEnableAutoClipboard(e) {
    this.remoteDesktopService.setEnableAutoClipboard(e);
  }
  setOnWarningCallback(e) {
    this.remoteDesktopService.setOnWarningCallback(e);
  }
  setOnClipboardRemoteUpdateCallback(e) {
    this.remoteDesktopService.setOnClipboardRemoteUpdate(e);
  }
  async saveRemoteClipboardData() {
    return await this.clipboardService.saveRemoteClipboardData();
  }
  async sendClipboardData() {
    return await this.clipboardService.sendClipboardData();
  }
  invokeExtension(e) {
    this.remoteDesktopService.invokeExtension(e);
  }
  enableFileTransfer(e) {
    const i = e.onUploadStarted, r = e.onUploadFinished;
    return e.onUploadStarted = () => {
      i == null ? void 0 : i(), this.clipboardService.suppressMonitoring();
    }, e.onUploadFinished = () => {
      this.clipboardService.resumeMonitoring(), r == null ? void 0 : r();
    }, this.remoteDesktopService.enableFileTransfer(e);
  }
  getExposedFunctions() {
    return {
      setVisibility: this.setVisibility.bind(this),
      configBuilder: this.configBuilder.bind(this),
      connect: this.connect.bind(this),
      onWarningCallback: this.setOnWarningCallback.bind(this),
      onClipboardRemoteUpdateCallback: this.setOnClipboardRemoteUpdateCallback.bind(this),
      setScale: this.setScale.bind(this),
      ctrlAltDel: this.ctrlAltDel.bind(this),
      metaKey: this.metaKey.bind(this),
      ctrlC: this.ctrlC.bind(this),
      ctrlV: this.ctrlV.bind(this),
      shutdown: this.shutdown.bind(this),
      setKeyboardUnicodeMode: this.setKeyboardUnicodeMode.bind(this),
      setCursorStyleOverride: this.setCursorStyleOverride.bind(this),
      resize: this.resize.bind(this),
      setEnableClipboard: this.setEnableClipboard.bind(this),
      setEnableAutoClipboard: this.setEnableAutoClipboard.bind(this),
      saveRemoteClipboardData: this.saveRemoteClipboardData.bind(this),
      sendClipboardData: this.sendClipboardData.bind(this),
      invokeExtension: this.invokeExtension.bind(this),
      enableFileTransfer: this.enableFileTransfer.bind(this)
    };
  }
}
var V = /* @__PURE__ */ ((t) => (t[t.Full = 0] = "Full", t[t.TextOnly = 1] = "TextOnly", t[t.TextOnlyServerOnly = 2] = "TextOnlyServerOnly", t[t.None = 3] = "None", t))(V || {}), er = /* @__PURE__ */ ((t) => (t[t.General = 0] = "General", t[t.WrongPassword = 1] = "WrongPassword", t[t.LogonFailure = 2] = "LogonFailure", t[t.AccessDenied = 3] = "AccessDenied", t[t.RDCleanPath = 4] = "RDCleanPath", t[t.ProxyConnect = 5] = "ProxyConnect", t[t.NegotiationFailure = 6] = "NegotiationFailure", t))(er || {});
const Os = 100;
function ne(t) {
  throw {
    kind: () => er.General,
    backtrace: () => t
  };
}
class Ls {
  constructor(e, i) {
    __publicField(this, "remoteDesktopService");
    __publicField(this, "module");
    __publicField(this, "ClipboardApiSupported", V.None);
    __publicField(this, "lastClientClipboardItems", {});
    __publicField(this, "lastReceivedClipboardData", {});
    __publicField(this, "lastSentClipboardData", null);
    __publicField(this, "clipboardDataToSave", null);
    __publicField(this, "lastClipboardMonitorLoopError", null);
    // When true, the clipboard monitoring loop skips reading/sending clipboard updates.
    // Used to prevent the monitoring loop from clobbering an active file upload's
    // FormatList with a text/image clipboard update.
    __publicField(this, "monitoringSuppressed", false);
    // The monitoring loop and the clipboard write waiting for focus belong to this component: a page can hold several,
    // and one being destroyed must not stop the others.
    __publicField(this, "disposed", false);
    __publicField(this, "monitoringActive", false);
    __publicField(this, "monitorTimer");
    // Only the latest remote clipboard content is written once the window has the focus again.
    __publicField(this, "pendingFocus", null);
    // Firefox v126 and below does not support `navigator.clipboard.read` and `navigator.clipboard.write`.
    // So, we need to define specific methods to handle text-only clipboard.
    //
    // Also, Firefox v124 and below does not support `navigator.clipboard.readText`.
    // Because of this, we cannot read the data from the clipboard at all.
    __publicField(this, "ffClipboardDataToSave", null);
    this.remoteDesktopService = e, this.module = i;
  }
  /**
   * Suppress clipboard monitoring. While suppressed, the 100ms monitoring
   * loop will skip reading the local clipboard and sending updates to the
   * remote. This prevents the monitor from clobbering a file upload's
   * FormatList announcement with a text/image clipboard update.
   */
  suppressMonitoring() {
    this.monitoringSuppressed = true;
  }
  /**
   * Resume clipboard monitoring after a previous {@link suppressMonitoring} call.
   */
  resumeMonitoring() {
    this.monitoringSuppressed = false;
  }
  /**
   * Stops the monitoring loop and drops the clipboard write waiting for focus, until the next session starts.
   */
  stopMonitoring() {
    this.monitoringActive = false, clearTimeout(this.monitorTimer), this.monitorTimer = void 0, this.pendingFocus = null;
  }
  /**
   * For when the component is destroyed: nothing is read from or written to the clipboard anymore.
   */
  dispose() {
    this.disposed = true, this.stopMonitoring();
  }
  async initClipboard() {
    if (!window.isSecureContext) {
      this.remoteDesktopService.emitWarningEvent("Clipboard is available only in secure contexts (HTTPS).");
      return;
    }
    if (navigator.clipboard != null && (navigator.clipboard.read != null && navigator.clipboard.write != null ? this.ClipboardApiSupported = V.Full : navigator.clipboard.readText != null ? (this.ClipboardApiSupported = V.TextOnly, this.remoteDesktopService.emitWarningEvent(
      "Clipboard is limited to text-only data types due to an outdated browser version!"
    )) : navigator.clipboard.writeText != null && (this.ClipboardApiSupported = V.TextOnlyServerOnly, this.remoteDesktopService.emitWarningEvent(
      "Clipboard reading is not supported and writing is limited to text-only data types due to an outdated browser version!"
    ))), this.ClipboardApiSupported === V.Full)
      try {
        (await navigator.permissions.query({
          name: "clipboard-read"
        })).state === "denied" && (this.ClipboardApiSupported = V.TextOnly);
      } catch {
        try {
          await navigator.clipboard.read();
        } catch {
          this.ClipboardApiSupported = V.TextOnly;
        }
      }
    if (this.ClipboardApiSupported === V.None) {
      this.remoteDesktopService.emitWarningEvent(
        "Clipboard is not supported due to an outdated browser version!"
      );
      return;
    }
    this.disposed || (this.remoteDesktopService.sessionEndedObservable.subscribe(() => this.stopMonitoring()), this.remoteDesktopService.setOnForceClipboardUpdate(this.onForceClipboardUpdate.bind(this)), this.ClipboardApiSupported === V.Full ? this.remoteDesktopService.autoClipboard ? (this.remoteDesktopService.setOnRemoteClipboardChanged(this.onRemoteClipboardChangedAutoMode.bind(this)), this.remoteDesktopService.sessionStartedObservable.subscribe((e) => {
      this.monitoringActive = !this.disposed, this.scheduleOnMonitorClipboardUpdate();
    })) : this.remoteDesktopService.setOnRemoteClipboardChanged(
      this.onRemoteClipboardChangedManualMode.bind(this)
    ) : this.remoteDesktopService.setOnRemoteClipboardChanged(this.ffOnRemoteClipboardChanged.bind(this)));
  }
  // Copies clipboard content received from the server to the local clipboard.
  // Returns the result of the operation. On failure, it additionally raises an error session event.
  async saveRemoteClipboardData() {
    if (this.ClipboardApiSupported !== V.Full)
      return await this.ffSaveRemoteClipboardData();
    this.clipboardDataToSave == null && ne("The server did not send the clipboard data.");
    try {
      const e = this.clipboardDataToRecord(this.clipboardDataToSave), i = new ClipboardItem(e);
      await navigator.clipboard.write([i]), this.clipboardDataToSave = null;
    } catch (e) {
      ne("Failed to write to the clipboard: " + e);
    }
  }
  // Sends local clipboard's content to the server.
  // Returns the result of the operation. On failure, it additionally raises an error session event.
  async sendClipboardData() {
    if (this.ClipboardApiSupported !== V.Full)
      return await this.ffSendClipboardData();
    const e = await navigator.clipboard.read().catch((s) => {
      ne("Failed to read from the clipboard: " + s);
    });
    e.length == 0 && ne("The clipboard has no data.");
    const i = e[0];
    i.types.some((s) => s.startsWith("text/") || s.startsWith("image/png")) || ne("The clipboard has no data of supported type (text or image).");
    const r = new this.module.ClipboardData();
    for (const s of i.types) {
      const o = s.startsWith("text/"), d = await i.getType(s);
      o ? r.addText(s, await d.text()) : r.addBinary(s, new Uint8Array(await d.arrayBuffer()));
    }
    r.isEmpty() || (this.lastSentClipboardData = r, await this.remoteDesktopService.onClipboardChanged(r));
  }
  scheduleOnMonitorClipboardUpdate() {
    clearTimeout(this.monitorTimer), this.monitorTimer = this.monitoringActive && !this.disposed ? setTimeout(() => {
      this.monitorTimer = void 0, this.onMonitorClipboard();
    }, Os) : void 0;
  }
  runWhenWindowFocused(e) {
    this.disposed || (document.hasFocus() ? Promise.resolve().then(() => this.disposed ? void 0 : e()).catch((i) => console.error("Failed to set client clipboard: " + i)) : this.pendingFocus = e);
  }
  /**
   * Runs the clipboard write that waited for the window to have the focus (the component calls it on focus).
   */
  flushFocused() {
    const e = this.pendingFocus;
    this.pendingFocus = null, e && this.runWhenWindowFocused(e);
  }
  // This function is required to convert `ClipboardData` to an object that can be used
  // with `ClipboardItem` API.
  clipboardDataToRecord(e) {
    const i = {};
    for (const r of e.items()) {
      const s = r.mimeType();
      i[s] = new Blob([r.value()], { type: s });
    }
    return i;
  }
  clipboardDataToClipboardItemsRecord(e) {
    const i = {};
    for (const r of e.items()) {
      const s = r.mimeType();
      i[s] = r.value();
    }
    return i;
  }
  // This callback is required to send initial clipboard state if available.
  async onForceClipboardUpdate() {
    try {
      if (this.disposed)
        return;
      this.lastSentClipboardData ? await this.remoteDesktopService.onClipboardChanged(this.lastSentClipboardData) : await this.remoteDesktopService.onClipboardChangedEmpty();
    } catch (e) {
      console.error("Failed to send initial clipboard state: " + e);
    }
  }
  // This callback is required to update client clipboard state when remote side has changed.
  onRemoteClipboardChangedManualMode(e) {
    this.clipboardDataToSave = e, this.remoteDesktopService.emitClipboardRemoteUpdateEvent();
  }
  // This callback is required to update client clipboard state when remote side has changed.
  onRemoteClipboardChangedAutoMode(e) {
    if (!this.disposed)
      try {
        const i = this.clipboardDataToRecord(e), r = new ClipboardItem(i);
        this.runWhenWindowFocused(() => (this.lastReceivedClipboardData = this.clipboardDataToClipboardItemsRecord(e), navigator.clipboard.write([r])));
      } catch (i) {
        console.error("Failed to set client clipboard: " + i);
      }
  }
  // Called periodically to monitor clipboard changes
  async onMonitorClipboard() {
    let e = false;
    try {
      if (this.disposed || !this.monitoringActive || this.monitoringSuppressed || !document.hasFocus())
        return;
      const i = await navigator.clipboard.read();
      if (i.length == 0)
        return;
      const r = i[0];
      if (!r.types.some((d) => d.startsWith("text/") || d.startsWith("image/png")))
        return;
      const s = {};
      let o = true;
      for (const d of r.types) {
        const b = d.startsWith("text/"), c = await r.getType(d), p = b ? await c.text() : new Uint8Array(await c.arrayBuffer()), h = b ? function(n, l) {
          return n === l;
        } : function(n, l) {
          return !(n instanceof Uint8Array) || !(l instanceof Uint8Array) ? false : n.length === l.length && n.every((a, u) => a === l[u]);
        }, w = this.lastClientClipboardItems[d];
        h(w, p) || (h(this.lastReceivedClipboardData[d], p) ? this.lastClientClipboardItems[d] = this.lastReceivedClipboardData[d] : o = false), s[d] = p;
      }
      if (!o && !this.disposed && this.monitoringActive && !this.monitoringSuppressed) {
        this.lastClientClipboardItems = s;
        const d = new this.module.ClipboardData();
        Object.entries(s).forEach(([b, c]) => {
          c != null && (b.startsWith("text/") && typeof c == "string" ? d.addText(b, c) : b.startsWith("image/") && c instanceof Uint8Array && d.addBinary(b, c));
        }), d.isEmpty() || (this.lastSentClipboardData = d, await this.remoteDesktopService.onClipboardChanged(d));
      }
    } catch (i) {
      if (i instanceof DOMException && i.name === "NotAllowedError") {
        console.warn("Clipboard monitoring disabled: browser requires user activation for clipboard read."), this.remoteDesktopService.setOnRemoteClipboardChanged(
          this.onRemoteClipboardChangedManualMode.bind(this)
        ), e = true;
        return;
      }
      i instanceof Error && ((this.lastClipboardMonitorLoopError === null || this.lastClipboardMonitorLoopError.toString() !== i.toString()) && console.error("Clipboard monitoring error: " + i), this.lastClipboardMonitorLoopError = i);
    } finally {
      e || this.scheduleOnMonitorClipboardUpdate();
    }
  }
  // This function is required to retrieve the text data from the `ClipboardData`.
  ffRetrieveTextData(e) {
    for (const i of e.items())
      if (i.mimeType().startsWith("text/")) {
        const r = i.value();
        if (typeof r == "string") return r;
      }
    return "";
  }
  // Firefox specific function.
  // This callback is required to update client clipboard state when remote side has changed.
  ffOnRemoteClipboardChanged(e) {
    const i = this.ffRetrieveTextData(e);
    i !== "" && (this.ffClipboardDataToSave = i, this.remoteDesktopService.emitClipboardRemoteUpdateEvent());
  }
  // Firefox specific function. We are using text-only clipboard API here.
  //
  // Copies clipboard content received from the server to the local clipboard.
  // Returns the result of the operation. On failure, it additionally raises an error session event.
  async ffSaveRemoteClipboardData() {
    this.ffClipboardDataToSave == null && ne("The server did not send the clipboard data.");
    try {
      await navigator.clipboard.writeText(this.ffClipboardDataToSave), this.ffClipboardDataToSave = null;
    } catch (e) {
      ne("Failed to write to the clipboard: " + e);
    }
  }
  // Firefox specific function. We are using text-only clipboard API here.
  //
  // Sends local clipboard's content to the server.
  // Returns the result of the operation. On failure, it additionally raises an error session event.
  async ffSendClipboardData() {
    this.ClipboardApiSupported !== V.TextOnly && ne("The browser does not support clipboard read.");
    const e = await navigator.clipboard.readText().catch((r) => {
      ne("Failed to read from the clipboard: " + r);
    });
    e.length == 0 && ne("The clipboard has no data.");
    const i = new this.module.ClipboardData();
    i.addText("text/plain", e), i.isEmpty() || (this.lastSentClipboardData = i, await this.remoteDesktopService.onClipboardChanged(i));
  }
}
var Ms = (t, e) => e(t, true), Fs = (t, e) => e(t, false), Ps = (t) => t.preventDefault(), Ns = /* @__PURE__ */ os('<div class="svelte-1103xra"><div><div class="screen-viewer svelte-1103xra"><canvas id="renderer" tabindex="0" class="svelte-1103xra"></canvas></div></div></div>');
const Us = {
  hash: "svelte-1103xra",
  code: ".screen-wrapper.svelte-1103xra {position:relative;}.capturing-inputs.svelte-1103xra {outline:1px solid rgba(0, 97, 166, 0.7);outline-offset:-1px;}canvas.svelte-1103xra {width:100%;height:100%;}.svelte-1103xra::selection {background-color:transparent;}.screen-wrapper.hidden.svelte-1103xra {pointer-events:none !important;position:absolute !important;visibility:hidden;height:100%;width:100%;transform:translate(-100%, -100%);}"
};
function tr(t, e) {
  Ki(e, true), us(t, Us);
  let i = lt(e, "scale"), r = lt(e, "verbose"), s = lt(e, "flexcenter"), o = lt(e, "module"), d = Mt(false), b = () => {
    var _a2, _b2;
    return F.info(`
            capturingInputs: ${document.activeElement === h}
            current active element: ${document.activeElement}
        `), ((_b2 = (_a2 = document.activeElement) == null ? void 0 : _a2.shadowRoot) == null ? void 0 : _b2.firstElementChild) === c;
  }, c, p, h, w = Mt(""), n = Mt(""), l = new $s(o()), a = new Ls(l, o()), u = new As(l, a), f = ve.Fit, $ = false, O;
  function m(v) {
    b() && Ve(v);
  }
  function _() {
    he(), et(), window.addEventListener("keydown", m, false), window.addEventListener("keyup", m, false), window.addEventListener("focus", be), window.addEventListener("blur", Me), document.addEventListener("visibilitychange", pe);
  }
  function M() {
    s() === "true" && (c.style.flexGrow = "", c.style.display = "", c.style.justifyContent = "", c.style.alignItems = "");
  }
  function P(v) {
    s() === "true" && (c.style.flexGrow = "1", c.style.display = "flex", c.style.justifyContent = "center", c.style.alignItems = "center");
  }
  function te(v, S, A) {
    let R = `height: ${v}; width: ${S}`;
    R = `${R}; max-height: ${v}; max-width: ${S}; min-height: ${v}; min-width: ${S}`, q(w, Te(R));
  }
  function le(v, S, A) {
    q(n, `height: ${v}; width: ${S}; overflow: ${A}`);
  }
  const Ce = (v) => {
    ie(i());
  };
  function he() {
    l.resizeObservable.subscribe((v) => {
      F.info(`Resize canvas to: ${v.desktopSize.width}x${v.desktopSize.height}`), h.width = v.desktopSize.width, h.height = v.desktopSize.height, ie(i());
    });
  }
  function et() {
    window.addEventListener("resize", Ce), l.scaleObservable.subscribe((v) => {
      F.info("Change scale!"), ie(v);
    }), l.dynamicResizeObservable.subscribe((v) => {
      F.info(`Dynamic resize!, width: ${v.width}, height: ${v.height}`), te(v.height.toString() + "px", v.width.toString() + "px");
    }), l.changeVisibilityObservable.subscribe((v) => {
      q(d, Te(v)), v && (le("100%", "100%", "hidden"), clearTimeout(O), O = setTimeout(() => ie(i()), 150));
    });
  }
  function tt() {
    ie(f);
  }
  function ie(v) {
    if (!$ && (M(), U(d)))
      switch (v) {
        case "fit":
        case ve.Fit:
          F.info("Size to fit"), f = ve.Fit, i("fit"), $t();
          break;
        case "full":
        case ve.Full:
          F.info("Size to full"), f = ve.Full, $e(), i("full");
          break;
        case "real":
        case ve.Real:
          F.info("Size to real"), f = ve.Real, Ae(), i("real");
          break;
      }
  }
  function $e() {
    const v = Ee(), S = v.x, A = v.y;
    let R = h.width, L = h.height;
    const z = Math.min(S / h.width, A / h.height);
    R = R * z, L = L * z, le(`${A}px`, `${S}px`, "hidden"), R = R > 0 ? R : 0, L = L > 0 ? L : 0, te(`${L}px`, `${R}px`);
  }
  function $t(v = false) {
    const S = Ee(), A = p.getBoundingClientRect(), R = S.x - A.x, L = S.y - A.y;
    let z = h.width, G = h.height;
    if (!v || R < h.width || L < h.height) {
      const st = Math.min(R / h.width, L / h.height);
      z = z * st, G = G * st;
    }
    z = z > 0 ? z : 0, G = G > 0 ? G : 0, le("initial", "initial", "hidden"), te(`${G}px`, `${z}px`), P();
  }
  function Ae() {
    const v = Ee(), S = p.getBoundingClientRect(), A = v.x - S.x, R = v.y - S.y;
    A < h.width || R < h.height ? le(`${Math.min(R, h.height)}px`, `${Math.min(A, h.width)}px`, "auto") : le("initial", "initial", "initial"), te(`${h.height}px`, `${h.width}px`), P();
  }
  function Oe(v) {
    const S = h == null ? void 0 : h.getBoundingClientRect(), A = (h == null ? void 0 : h.width) / S.width, R = (h == null ? void 0 : h.height) / S.height, L = {
      x: Math.round((v.clientX - S.left) * A),
      y: Math.round((v.clientY - S.top) * R)
    };
    l.updateMousePosition(L);
  }
  function We(v, S) {
    l.mouseButtonState(v, S, true);
  }
  function it(v) {
    l.mouseWheel(v);
  }
  function At(v) {
    h.focus({ preventScroll: true }), l.mouseIn(v);
  }
  function Le(v) {
    l.mouseOut(v);
  }
  function Ve(v) {
    return l.sendKeyboardEvent(v), true;
  }
  function Ee() {
    const v = window, S = document, A = S.documentElement, R = S.getElementsByTagName("body")[0], L = v.innerWidth ?? A.clientWidth ?? R.clientWidth, z = v.innerHeight ?? A.clientHeight ?? R.clientHeight;
    return { x: L, y: z };
  }
  async function Ke() {
    F.info("Start canvas initialization..."), h.width = 800, h.height = 600, l.setCanvas(h), l.setOnCanvasResized(tt), _();
  }
  function rt() {
    let v = {
      irgUserInteraction: u.getExposedFunctions()
    };
    F.info("Component ready"), F.info("Dispatching ready event"), c.dispatchEvent(new CustomEvent("ready", {
      detail: v,
      bubbles: true,
      composed: true
    }));
  }
  function be() {
    a.flushFocused();
  }
  function Me() {
    l.focusLost();
  }
  function pe() {
    document.visibilityState === "hidden" && l.focusLost();
  }
  Zi(async () => {
    if (F.verbose = r() === "true", F.info("Dom ready"), await Ke(), !$) {
      try {
        await a.initClipboard();
      } catch (v) {
        F.error("Clipboard initialization failed: " + v);
      }
      $ || rt();
    }
  }), hs(() => {
    $ = true, clearTimeout(O), a.dispose(), window.removeEventListener("resize", Ce), window.removeEventListener("keydown", m, false), window.removeEventListener("keyup", m, false), window.removeEventListener("focus", be), window.removeEventListener("blur", Me), document.removeEventListener("visibilitychange", pe);
  });
  var ke = Ns(), X = Pt(ke);
  let Fe;
  var Se = Pt(X), j = Pt(Se);
  return j.__mousemove = Oe, j.__mousedown = [Ms, We], j.__mouseup = [Fs, We], j.__contextmenu = [Ps], Nt(j, (v) => h = v, () => h), Ft(Se), Ft(X), Nt(X, (v) => p = v, () => p), Ft(ke), Nt(ke, (v) => c = v, () => c), Gr(() => {
    Fe = cs(X, 1, `screen-wrapper scale-${i() ?? ""}`, "svelte-1103xra", Fe, {
      hidden: !U(d),
      "capturing-inputs": b
    }), ui(X, "style", U(n)), ui(Se, "style", U(w));
  }), at("mouseleave", j, (v) => {
    Le(v);
  }), at("mouseenter", j, (v) => {
    At(v);
  }), at("wheel", j, it), at("selectstart", j, (v) => {
    v.preventDefault();
  }), Gi(t, ke), qi({
    get scale() {
      return i();
    },
    set scale(v) {
      i(v), je();
    },
    get verbose() {
      return r();
    },
    set verbose(v) {
      r(v), je();
    },
    get flexcenter() {
      return s();
    },
    set flexcenter(v) {
      s(v), je();
    },
    get module() {
      return o();
    },
    set module(v) {
      o(v), je();
    }
  });
}
ss([
  "mousemove",
  "mousedown",
  "mouseup",
  "contextmenu"
]);
customElements.define("iron-remote-desktop", ws(
  tr,
  {
    scale: {},
    verbose: {},
    flexcenter: {},
    module: {}
  },
  [],
  [],
  false,
  (t) => class extends t {
    constructor() {
      super(), this.attachShadow({ mode: "open", delegatesFocus: true });
    }
  }
));
const Bs = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: tr
}, Symbol.toStringTag, { value: "Module" }));
export {
  Ts as Config,
  Rs as ConfigBuilder,
  Bs as default
};

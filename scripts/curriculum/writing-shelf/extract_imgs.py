"""Placement rectangles of every image XObject on a page, in mm from bottom-left."""
import pikepdf
PT = 72.0/25.4

def _mul(a,b):
    return (a[0]*b[0]+a[1]*b[2], a[0]*b[1]+a[1]*b[3],
            a[2]*b[0]+a[3]*b[2], a[2]*b[1]+a[3]*b[3],
            a[4]*b[0]+a[5]*b[2]+b[4], a[4]*b[1]+a[5]*b[3]+b[5])

def image_rects(page):
    res = page.get('/Resources', {})
    xo = res.get('/XObject', {}) if res else {}
    ctm=(1,0,0,1,0,0); stack=[]; out=[]
    for op in pikepdf.parse_content_stream(page):
        o=str(op.operator)
        if o=='q': stack.append(ctm)
        elif o=='Q': ctm=stack.pop() if stack else ctm
        elif o=='cm':
            m=tuple(float(x) for x in op.operands)
            ctm=_mul(m,ctm)
        elif o=='Do':
            name=str(op.operands[0])
            obj=xo.get(name) if xo else None
            if obj is not None and str(obj.get('/Subtype'))=='/Image':
                pts=[(0,0),(1,0),(1,1),(0,1)]
                xs=[];ys=[]
                for x,y in pts:
                    xs.append(x*ctm[0]+y*ctm[2]+ctm[4]); ys.append(x*ctm[1]+y*ctm[3]+ctm[5])
                out.append((min(xs)/PT,min(ys)/PT,max(xs)/PT,max(ys)/PT))
    return out

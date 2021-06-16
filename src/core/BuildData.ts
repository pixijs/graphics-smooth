export class BuildData {
    verts: Array<number> = [];
    joints: Array<number> = [];
    vertexSize: number = 0;
    indexSize: number = 0;
    closePointEps = 1e-4;

    clear() {
        this.verts.length = 0;
        this.joints.length = 0;
        this.vertexSize = 0;
        this.indexSize = 0;
    }

    destroy() {
        this.verts.length = 0;
        this.joints.length = 0;
    }
}

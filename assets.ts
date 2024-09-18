export interface Mount {

    readonly href: string;
    readonly remote: string;
    readonly integrity?: string;
    readonly Accept?: string;

}





export const pico_css = {

    version: '2.0.6',

    integrity: 'sha256-3V/VWRr9ge4h3MEXrYXAFNw/HxncLXt9EB6grMKSdMI=',

    Accept: 'text/css',

    get href () {
        return `/static/css/pico/${ this.version }/pico.min.css`;
    },

    base: 'https://esm.sh/@picocss/pico',

    get remote () {
        return `${ this.base }@${ this.version }/css/pico.min.css`;
    },

} as const;





export const bundle: readonly Mount[] = [

    pico_css,

];


import { PRODUCT_NAME } from './constants';
import SerialConsolePage from './components/SerialConsolePage.vue';
import VNCConsolePage from './components/VNCConsolePage.vue';
import KubeVirtDashboard from './components/KubeVirtDashboard.vue';

const routes = [
  {
    route: {
      name: `${PRODUCT_NAME}-dashboard`,
      path: `/c/:cluster/${PRODUCT_NAME}/dashboard`,
      component: KubeVirtDashboard,
      meta: {
        product: PRODUCT_NAME,
      },
    },
    parent: 'c-cluster',
  },
  {
    route: {
      name: `${PRODUCT_NAME}-c-cluster-vm-serialconsole`,
      path: `/:product/c/:cluster/console/:namespace/:vm/serial`,
      component: SerialConsolePage,
      meta: {
        product: PRODUCT_NAME,
      },
    },
    parent: 'blank',
  },
  {
    route: {
      name: `${PRODUCT_NAME}-c-cluster-vm-vncconsole`,
      path: `/:product/c/:cluster/console/:namespace/:vm/vnc`,
      component: VNCConsolePage,
      meta: {
        product: PRODUCT_NAME,
      },
    },
    parent: 'blank',
  },
];

export default routes;

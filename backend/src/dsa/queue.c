#include "queue.h"
#include <stdlib.h>
void cb_queue_init(CBQueue*q){if(q){q->front=q->back=NULL;q->size=0;}}
int cb_queue_enqueue(CBQueue*q,int v){if(!q)return 0;CBQueueNode*n=(CBQueueNode*)malloc(sizeof(*n));if(!n)return 0;n->value=v;n->next=NULL;if(q->back)q->back->next=n;else q->front=n;q->back=n;q->size++;return 1;}
int cb_queue_dequeue(CBQueue*q,int*out){if(!q||!q->front)return 0;CBQueueNode*n=q->front;if(out)*out=n->value;q->front=n->next;if(!q->front)q->back=NULL;q->size--;free(n);return 1;}
int cb_queue_peek(const CBQueue*q,int*out){if(!q||!q->front||!out)return 0;*out=q->front->value;return 1;}
size_t cb_queue_display(const CBQueue*q,int*out,size_t cap){if(!q)return 0;size_t n=0;for(CBQueueNode*p=q->front;p;p=p->next){if(out&&n<cap)out[n]=p->value;n++;}return n;}
void cb_queue_clear(CBQueue*q){if(!q)return;int x;while(cb_queue_dequeue(q,&x)){} }

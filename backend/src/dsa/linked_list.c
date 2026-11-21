#include "linked_list.h"
#include <stdlib.h>
int cb_list_insert(CBListNode **head,int v){if(!head)return 0;CBListNode*n=(CBListNode*)malloc(sizeof(*n));if(!n)return 0;n->value=v;n->next=*head;*head=n;return 1;}
int cb_list_delete(CBListNode **head,int v){if(!head)return 0;CBListNode **p=head;while(*p&&(*p)->value!=v)p=&(*p)->next;if(!*p)return 0;CBListNode*t=*p;*p=t->next;free(t);return 1;}
CBListNode *cb_list_search(CBListNode*h,int v){for(;h;h=h->next)if(h->value==v)return h;return NULL;}
size_t cb_list_traverse(const CBListNode*h,int*out,size_t cap){size_t n=0;for(;h;h=h->next){if(out&&n<cap)out[n]=h->value;n++;}return n;}
void cb_list_free(CBListNode **h){if(!h)return;while(*h){CBListNode*n=(*h)->next;free(*h);*h=n;}}
